/** Frozen compatibility-only source. Original SHA-256: 80b1e85f9bc03ec653d32dac5c6e59a242330ae9acb1466b55f19dc9b888c902.
 * Replays historical choices only; never a current automatic reading. */
import { revisionRecordSchema, transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import type { LocalAnnualOutlook, LocalAnnualYear } from "./local-annual-outlook";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, type LocalOutlookJudgment } from "./local-outlook-judgment";
import { outlookDirectionCaption } from "../outlook-judgment-presentation";

export const LOCAL_READING_TIMELINE_VERSION = "hakimi.local-reading-timeline/0.3.0" as const;
export type ReadingTimelineBranchId = "locked" | "forward" | "backward" | "unresolved";
export interface ReadingTimelineYearLink {
  year: number; nodeRef: TransitNodeRef; caption: string; reason: string; lifeTheme: string; axisIds: string[];
  startInstant: string; endExclusiveInstant: string; backgroundRefs: TransitNodeRef[]; conditions: string[]; evidence: string[];
}
export interface ReadingTimelineStage {
  id: string; branchId: ReadingTimelineBranchId; branchLabel: string; startYear: number; endYear: number;
  startInstant: string; endExclusiveInstant: string; caption: string; headline: string; summary: string;
  yearLinks: ReadingTimelineYearLink[]; backgroundRefs: TransitNodeRef[]; conditions: string[]; evidence: string[];
}
export interface ReadingTimelineTurningPoint {
  id: string; kind: "handover" | "judgment_change"; branchId: ReadingTimelineBranchId; atInstant: string; year: number;
  headline: string; summary: string; before: ReadingTimelineYearLink; after: ReadingTimelineYearLink; conditions: string[]; evidence: string[];
}
export interface ReadingTimelineGap {
  year: number; branchId: ReadingTimelineBranchId; kind: "unavailable_year" | "missing_background" | "missing_branch_coverage";
  startInstant: string | null; endExclusiveInstant: string | null; message: string; conditions: string[];
}
export interface ReadingTimelineNarrativeStatement {
  id: string;
  kind: "overview" | "support_window" | "pressure_window" | "mixed_window" | "turning_point" | "coverage";
  text: string; stageIds: string[]; turningPointIds: string[];
}
export interface ReadingTimelineBranchNarrative {
  headline: string; statements: ReadingTimelineNarrativeStatement[]; paragraphs: string[]; conditions: string[];
}
export interface ReadingTimelineBranch {
  id: ReadingTimelineBranchId; label: string; stageIds: string[]; turningPointIds: string[];
  currentStageId: string | null; nextStageId: string | null; conditions: string[];
  narrative: ReadingTimelineBranchNarrative;
}
export interface LocalReadingTimeline {
  version: typeof LOCAL_READING_TIMELINE_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  startYear: number; endYear: number; sourceVersions: string[]; lifeReferenceInstant: string | null;
  headline: string; summary: string; branches: ReadingTimelineBranch[]; stages: ReadingTimelineStage[];
  turningPoints: ReadingTimelineTurningPoint[]; gaps: ReadingTimelineGap[]; limitations: string[];
}
type Piece = { branchId: ReadingTimelineBranchId; year: LocalAnnualYear; judgment: LocalOutlookJudgment; link: ReadingTimelineYearLink; signature: string; backgroundNames: string[] };
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const instant = (value: string) => { const time = Date.parse(value); if (!Number.isFinite(time)) throw new Error("时间脉络包含无效瞬时点。"); return time; };
const dateTime = (value: string) => new Date(instant(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ") + "（UTC+08）";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sameRef = (a: TransitNodeRef, b: TransitNodeRef) => stable(a) === stable(b);
const refsUnique = (refs: TransitNodeRef[]) => [...new Map(refs.map((ref) => [stable(ref), ref])).values()];
const branchLabel = (id: ReadingTimelineBranchId) => ({ locked: "按当前修订的起运方向", forward: "若按顺行", backward: "若按逆行", unresolved: "方向尚未解析" })[id];
const axesSignature = (j: LocalOutlookJudgment) => stable(j.axes.map((a) => ({ axis: a.axis, pathId: a.pathId, effect: a.effect })).sort((a, b) => a.axis.localeCompare(b.axis)));

function yearReason(year: LocalAnnualYear, judgment: LocalOutlookJudgment): { reason: string; evidence: string[] } {
  const main = judgment.axes.find((axis) => axis.axis === judgment.primaryAxis);
  if (!main) return { reason: judgment.summary || year.summary, evidence: [...judgment.conditions] };
  // In the existing model a branch main qi can supply the direction even when
  // the visible stem has no separate direction. Preserve that existing evidence
  // verbatim instead of inventing a new causal score or relabeling the year.
  const branchEvidence = main.evidence.filter((line) => line.includes("只作为支内本气承接") && /支持此路径分支|增加阻碍或负荷/.test(line));
  const reason = main.summary.includes("未因目标天干形成单一助力或压力") && branchEvidence.length
    ? `本年天干未单独定向，现有${main.axis === "pattern" ? "结构" : main.axis === "balance" ? "扶抑" : "调候"}判断另有支内承接依据：${branchEvidence.join(" ")}`
    : main.summary || judgment.summary;
  return { reason, evidence: unique([...main.evidence, ...main.blockers, ...main.rescues]) };
}

const localDate = (value: string) => new Date(instant(value) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const stageRange = (stage: ReadingTimelineStage) => `${localDate(stage.startInstant)}至${localDate(stage.endExclusiveInstant)}前`;

/** Summarize existing stages, never merge them again or infer a decade from
 * annual votes. Anchors retain the full, exact half-open intervals and causes. */
function branchNarrative(id: ReadingTimelineBranchId, startYear: number, endYear: number,
  stages: ReadingTimelineStage[], turns: ReadingTimelineTurningPoint[], gaps: ReadingTimelineGap[], pieces: Piece[]): ReadingTimelineBranchNarrative {
  const statements: ReadingTimelineNarrativeStatement[] = [];
  const add = (kind: ReadingTimelineNarrativeStatement["kind"], text: string, selected: ReadingTimelineStage[] = [], selectedTurns: ReadingTimelineTurningPoint[] = []) => {
    statements.push({ id: `narrative:${id}:${kind}`, kind, text, stageIds: unique(selected.map((stage) => stage.id)), turningPointIds: selectedTurns.map((turn) => turn.id) });
  };
  const narrativeReason = (link: ReadingTimelineYearLink) => {
    const piece = pieces.find((item) => item.branchId === id && item.link.year === link.year
      && item.link.startInstant === link.startInstant && item.link.endExclusiveInstant === link.endExclusiveInstant
      && sameRef(item.link.nodeRef, link.nodeRef));
    if (!piece) throw new Error("走势叙述的示例与原分支、年份或分段不匹配。");
    const judgment = piece.judgment, primary = judgment.axes.find((axis) => axis.axis === judgment.primaryAxis);
    if (judgment.label !== "利弊并见" || !primary || primary.effect === "mixed") return link.reason;
    const seen = new Set<string>(), additions: string[] = [];
    for (const axis of judgment.axes) {
      if (axis === primary || axis.effect === "neutral" || axis.effect === "unresolved") continue;
      const opposite = primary.effect === "assists" ? axis.effect === "obstructs" || axis.effect === "mixed"
        : primary.effect === "obstructs" ? axis.effect === "assists" || axis.effect === "mixed" : true;
      if (!opposite) continue;
      const original = [axis.summary, ...axis.blockers, ...axis.rescues].filter((line) => {
        if (!line || seen.has(line) || link.reason.includes(line)) return false;
        seen.add(line); return true;
      });
      if (original.length) additions.push(`同一分段的${{ balance: "扶抑", pattern: "格局", seasonal: "调候" }[axis.axis]}作用：${original.join(" ")}`);
    }
    return [link.reason, ...additions].join(" ");
  };
  const category = (stage: ReadingTimelineStage) => {
    const j = pieces.find((piece) => piece.link.startInstant === stage.startInstant)!.judgment;
    if (j.label === "较顺") return "support";
    if (j.label === "有压力") return "pressure";
    if (j.label === "利弊并见") return "mixed";
    if (j.label !== "条件性") return "conditional";
    const effect = j.axes.find((axis) => axis.axis === j.primaryAxis)?.effect;
    return effect === "assists" ? "support" : effect === "obstructs" ? "pressure" : effect === "mixed" ? "mixed" : "conditional";
  };
  const explain = (stage: ReadingTimelineStage) => `${stageRange(stage)}，${stage.caption}。以${stage.yearLinks[0]!.year}年的作用为例：${narrativeReason(stage.yearLinks[0]!)}`;
  const first = stages[0], last = stages.at(-1);
  const conditions = ["日期按UTC+08展示；起止日内的精确交接时刻见对应阶段，结束瞬时不属于前段。", "此处概括本年度窗口内的原判断，不代表整步大运，也不由年份多数推定长期方向。",
    ...(id !== "locked" ? ["本分支与另一顺逆分支平行，不能合并为同一人的先后经历。"] : [])];
  if (!first || !last) {
    add("overview", `${startYear}—${endYear}年没有可据以概括走势的分段判断。`);
    add("coverage", gaps.length ? unique(gaps.map((gap) => `${gap.year}年：${gap.message}`)).join(" ") : "当前没有可用的年度分段，未补入邻年结论。");
    return { headline: `${startYear}—${endYear}年：暂无可读走势`, statements, paragraphs: [], conditions };
  }
  // Sentence-level ranges shorten repeated captions only. The original stage
  // boundaries, identities, axes and background differences remain intact.
  const ranges: { first: ReadingTimelineStage; last: ReadingTimelineStage }[] = [];
  for (const stage of stages) {
    const previous = ranges.at(-1);
    if (previous && previous.last.endExclusiveInstant === stage.startInstant && previous.last.caption === stage.caption) previous.last = stage;
    else ranges.push({ first: stage, last: stage });
  }
  add("overview", `${ranges.map((range) => `${localDate(range.first.startInstant)}至${localDate(range.last.endExclusiveInstant)}前，${range.first.caption}`).join("；随后，")}。${first.yearLinks[0]!.year}年的起段依据：${narrativeReason(first.yearLinks[0]!)}`, stages);
  const supportive = stages.filter((stage) => category(stage) === "support");
  const pressures = stages.filter((stage) => category(stage) === "pressure");
  const mixed = stages.filter((stage) => category(stage) === "mixed");
  if (supportive.length) add("support_window", supportive.slice(0, 2).map(explain).join(" "), supportive.slice(0, 2));
  else if (mixed.length) add("mixed_window", mixed.slice(0, 2).map(explain).join(" "), mixed.slice(0, 2));
  const turn = turns.find((point) => point.kind === "handover") ?? turns[0];
  if (turn) {
    const same = turn.before.caption === turn.after.caption;
    const selected = stages.filter((stage) => stage.endExclusiveInstant === turn.atInstant || stage.startInstant === turn.atInstant);
    add("turning_point", `${turn.headline}。${turn.kind === "handover" && same ? `换运前后仍为“${turn.after.caption}”，不是自动转好。` : same ? `总体表述仍为“${turn.after.caption}”，变化在具体作用条件。` : `前段“${turn.before.caption}”，后段“${turn.after.caption}”。`}后段依据：${narrativeReason(turn.after)}`, selected, [turn]);
  }
  if (gaps.length) {
    const unavailable = unique(gaps.filter((gap) => gap.kind === "unavailable_year").map((gap) => gap.year));
    const missing = gaps.find((gap) => gap.kind !== "unavailable_year");
    add("coverage", [unavailable.length ? `${unavailable.join("、")}年未纳入可用走势；${gaps.find((gap) => gap.kind === "unavailable_year")!.message}` : "",
      missing ? `${missing.startInstant ? dateTime(missing.startInstant) : missing.year}至${missing.endExclusiveInstant ? dateTime(missing.endExclusiveInstant) : "区间结束"}：${missing.message}` : ""].filter(Boolean).join(" "),
      missing ? stages.filter((stage) => stage.yearLinks.some((link) => link.startInstant === missing.startInstant && link.endExclusiveInstant === missing.endExclusiveInstant)) : []);
  } else if (statements.length < 4 && pressures.length) add("pressure_window", pressures.slice(0, 2).map(explain).join(" "), pressures.slice(0, 2));
  if (statements.length < 2) add("coverage", `${startYear}—${endYear}年的已计算分段保持原结论；未识别到另一个可单列的变化点。`, stages);
  // A supportive window must not suppress the separate mixed period's
  // obstacle and rescue. Append it without changing existing selections.
  if (supportive.length && mixed.length) add("mixed_window", explain(mixed[0]!), [mixed[0]!]);
  const detail = (supportive.find((stage) => stage.yearLinks.length > 1) ?? stages.find((stage) => stage.yearLinks.length > 1));
  const finalLink = detail?.yearLinks.at(-1);
  const paragraphs = detail && finalLink ? [`同段年份的作用对象仍有区别。例如${finalLink.year}年（${localDate(finalLink.startInstant)}至${localDate(finalLink.endExclusiveInstant)}前）：${narrativeReason(finalLink)}`] : [];
  conditions.push("首页仅摘取部分已有阶段与一个变化点；其余时段、逐年原因和完整条件保留在阶段详解。");
  if (gaps.length) conditions.push("有缺口的部分不延用相邻结论；起运前仅有本年自身判断的时段，不能视为已有大运背景。");
  return { headline: `${startYear}—${endYear}年：${unique(stages.map((stage) => stage.caption)).join("；")}`, statements, paragraphs, conditions };
}

/** Read-only organization of already calculated conclusions. It creates no new
 * score, auspiciousness rule, event probability or substitute direction. */
export function buildReadingTimeline({ revision, annual, life = null }: {
  revision: RevisionRecord; annual: LocalAnnualOutlook; life?: LocalLifeOutlook | null;
}): LocalReadingTimeline {
  const r = revisionRecordSchema.parse(revision), includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const binding = { revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour };
  if (annual.revisionId !== r.id || annual.chartResultHash !== r.manifest.resultHash || (life && (life.revisionId !== r.id || life.chartResultHash !== r.manifest.resultHash))) throw new Error("时间脉络与命盘来源不匹配。");
  if (!Number.isInteger(annual.startYear) || !Number.isInteger(annual.endYear) || annual.startYear > annual.endYear) throw new Error("时间脉络年度范围无效。");
  if (life) instant(life.referenceInstant);
  const branchIds: ReadingTimelineBranchId[] = r.input.sex === "unspecified" ? ["forward", "backward"] : ["locked"];
  const pieces: Piece[] = [], gaps: ReadingTimelineGap[] = [], yearsSeen = new Set<number>(), versions: string[] = [annual.version, ...(life ? [life.version] : [])];
  const assertRef = (ref: TransitNodeRef) => {
    const parsed = transitNodeRefSchema.parse(ref);
    if (parsed.revisionId !== r.id || parsed.chartResultHash !== r.manifest.resultHash) throw new Error("时间脉络节点来源不匹配。");
  };
  const assertJudgment = (judgment: LocalOutlookJudgment, ref: TransitNodeRef) => {
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION) throw new Error("时间脉络不接受混用或未支持的判断版本。");
    assertRef(judgment.targetRef);
    if (stable(judgment.sourceBinding) !== stable(binding) || !sameRef(judgment.targetRef, ref)) throw new Error("时间脉络判断来源或目标节点不匹配。");
    versions.push(judgment.version, judgment.policyVersion);
  };
  for (const year of annual.years) {
    if (!Number.isInteger(year.year) || year.year < annual.startYear || year.year > annual.endYear || yearsSeen.has(year.year)) throw new Error("时间脉络年份重复或超出范围。");
    yearsSeen.add(year.year);
    if (year.transitNodeRef) { assertRef(year.transitNodeRef); if (year.transitNodeRef.nodeType !== "year") throw new Error("时间脉络年度节点类型错误。"); }
    for (const judgment of [year.judgment, year.ownJudgment]) if (judgment) {
      if (!year.transitNodeRef) throw new Error("时间脉络判断缺少年度节点。");
      assertJudgment(judgment, year.transitNodeRef);
    }
    for (const segment of year.judgmentSegments) if (!branchIds.includes(segment.branchId)) throw new Error("时间脉络出现与修订不一致的顺逆分支。");
    for (const id of branchIds) {
      const segments = year.judgmentSegments.filter((segment) => segment.branchId === id);
      if (!year.transitNodeRef || !year.startInstant || !year.endExclusiveInstant || !year.judgment || year.label === "暂不可判") {
        if (segments.length) throw new Error("不可用年份不能携带可读分段判断。");
        gaps.push({ year: year.year, branchId: id, kind: "unavailable_year", startInstant: year.startInstant, endExclusiveInstant: year.endExclusiveInstant,
          message: year.summary, conditions: [...year.conditions] }); continue;
      }
      let cursor = instant(year.startInstant); const end = instant(year.endExclusiveInstant), segmentIds = new Set<string>();
      if (cursor >= end) throw new Error("时间脉络年度区间无效。");
      for (const segment of segments) {
        const j = segment.judgment, start = instant(segment.startInstant), finish = instant(segment.endExclusiveInstant);
        assertJudgment(j, year.transitNodeRef);
        if (segmentIds.has(segment.id) || start < cursor || start >= finish || finish > end) throw new Error("时间脉络分段重复、交叠、逆序或越界。");
        segmentIds.add(segment.id);
        if (stable(j.sourceBinding) !== stable(binding) || !sameRef(j.targetRef, year.transitNodeRef)
          || j.interval.startInstant !== segment.startInstant || j.interval.endExclusiveInstant !== segment.endExclusiveInstant) throw new Error("时间脉络分段判断与节点或区间不匹配。");
        if (start > cursor) gaps.push({ year: year.year, branchId: id, kind: "missing_branch_coverage", startInstant: new Date(cursor).toISOString(), endExclusiveInstant: segment.startInstant,
          message: "这一分支的该时段没有已计算的分段判断。", conditions: ["未把相邻时段的结论补入空白区间。"] });
        const backgroundNames: string[] = [];
        for (const ref of j.backgroundRefs) {
          assertRef(ref);
          const background = year.dayunSegments.find((item) => item.direction === id && sameRef(item.nodeRef, ref));
          if (ref.nodeType !== "dayun" || !background || instant(background.startInstant) > start || instant(background.endExclusiveInstant) < finish) throw new Error("时间脉络大运背景与实际分支覆盖不匹配。");
          backgroundNames.push(background.ganZhi);
        }
        if (!j.backgroundRefs.length) gaps.push({ year: year.year, branchId: id, kind: "missing_background", startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
          message: "这段已有本年自身判断，但没有大运背景覆盖。", conditions: ["不把尚未交运或未覆盖部分延用为之后的大运。", ...j.conditions] });
        const cause = yearReason(year, j);
        const link: ReadingTimelineYearLink = { year: year.year, nodeRef: structuredClone(year.transitNodeRef), caption: outlookDirectionCaption(j, year.label), reason: cause.reason, lifeTheme: id === "locked" ? year.primaryTheme.text : cause.reason,
          axisIds: j.axes.map((axis) => axis.id), startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
          backgroundRefs: structuredClone(j.backgroundRefs), conditions: unique([...j.conditions, ...(id !== "locked" ? [`${branchLabel(id)}为平行条件分支，未替用户确定顺逆。`] : [])]), evidence: unique([...cause.evidence, ...(id === "locked" ? year.primaryTheme.evidence : [])]) };
        pieces.push({ branchId: id, year, judgment: j, link, backgroundNames,
          signature: stable({ caption: link.caption, axes: axesSignature(j), background: j.backgroundRefs.map(stable).sort() }) });
        cursor = finish;
      }
      if (cursor < end) gaps.push({ year: year.year, branchId: id, kind: "missing_branch_coverage", startInstant: new Date(cursor).toISOString(), endExclusiveInstant: year.endExclusiveInstant,
        message: "这一分支的该时段没有已计算的分段判断。", conditions: ["未将已有年份标签扩展为该空白时段的结论。"] });
    }
  }
  for (let year = annual.startYear; year <= annual.endYear; year++) if (!yearsSeen.has(year)) for (const id of branchIds) gaps.push({ year, branchId: id, kind: "unavailable_year", startInstant: null, endExclusiveInstant: null,
    message: `${year}年没有输入的年度计算结果。`, conditions: ["未由前后年份推填。"] });
  const stages: ReadingTimelineStage[] = [], turningPoints: ReadingTimelineTurningPoint[] = [], branches: ReadingTimelineBranch[] = [];
  for (const id of branchIds) {
    const ordered = pieces.filter((piece) => piece.branchId === id).sort((a, b) => instant(a.link.startInstant) - instant(b.link.startInstant));
    let last: Piece | null = null, stage: ReadingTimelineStage | null = null;
    for (const piece of ordered) {
      const adjacent = last && last.link.endExclusiveInstant === piece.link.startInstant && piece.link.year - last.link.year <= 1;
      if (last && instant(last.link.endExclusiveInstant) > instant(piece.link.startInstant)) throw new Error("时间脉络年度间区间交叠。");
      if (!stage || !adjacent || last!.signature !== piece.signature) {
        stage = { id: `stage:${id}:${piece.link.startInstant}`, branchId: id, branchLabel: branchLabel(id), startYear: piece.link.year, endYear: piece.link.year,
          startInstant: piece.link.startInstant, endExclusiveInstant: piece.link.endExclusiveInstant, caption: piece.link.caption, headline: "", summary: "",
          yearLinks: [], backgroundRefs: structuredClone(piece.link.backgroundRefs), conditions: [], evidence: [] }; stages.push(stage);
      }
      stage.endYear = piece.link.year; stage.endExclusiveInstant = piece.link.endExclusiveInstant; stage.yearLinks.push(piece.link);
      stage.conditions = unique([...stage.conditions, ...piece.link.conditions]); stage.evidence = unique([...stage.evidence, ...piece.link.evidence]);
      const span = stage.startYear === stage.endYear ? `${stage.startYear}年` : `${stage.startYear}—${stage.endYear}年`;
      stage.headline = `${span}：${stage.caption}`;
      const first = stage.yearLinks[0]!;
      stage.summary = `${piece.backgroundNames.length ? `${unique(piece.backgroundNames).join("、")}大运背景下，` : "未覆盖大运的时段内，"}${span}${stage.caption}。${id !== "locked" ? `其中${first.year}年的本分支依据：${first.lifeTheme}` : stage.yearLinks.length > 1 ? `其中${first.year}年的生活主题：${first.lifeTheme}` : `${piece.link.reason}对应${piece.link.year}年的生活主题：${piece.link.lifeTheme}`}`;
      if (adjacent && last) {
        const backgroundChanged = stable(last.link.backgroundRefs) !== stable(piece.link.backgroundRefs);
        const actualHandover = backgroundChanged && piece.link.backgroundRefs.some((ref) => ref.startInstant === piece.link.startInstant);
        const directionChanged = axesSignature(last.judgment) !== axesSignature(piece.judgment) || last.link.caption !== piece.link.caption;
        if (actualHandover || directionChanged) {
          const kind = actualHandover ? "handover" : "judgment_change";
          const beforeNames = last.backgroundNames.join("、") || "尚无大运覆盖", afterNames = piece.backgroundNames.join("、") || "尚无大运覆盖";
          const sameCaption = last.link.caption === piece.link.caption;
          const effectNames = { assists: "支持", obstructs: "受阻", mixed: "助力与牵制并存", neutral: "未固定方向", unresolved: "条件尚未求定" };
          const axisChanges = piece.judgment.axes.flatMap((axis) => {
            const previous = last!.judgment.axes.find((item) => item.axis === axis.axis);
            return previous && previous.effect !== axis.effect ? [`${{ balance: "扶抑", pattern: "格局", seasonal: "调候" }[axis.axis]}由${effectNames[previous.effect]}变为${effectNames[axis.effect]}`] : [];
          });
          const headline = actualHandover ? `${dateTime(piece.link.startInstant)}：${beforeNames}转入${afterNames}` : `${piece.link.year}年起，已有作用判断出现变化`;
          turningPoints.push({ id: `turn:${id}:${piece.link.startInstant}`, kind, branchId: id, atInstant: piece.link.startInstant, year: piece.link.year, headline,
            summary: actualHandover ? `${sameCaption ? `换运前后均为“${piece.link.caption}”，此次换运不表示自动转好。` : `前段“${last.link.caption}”，后段“${piece.link.caption}”，按实际交运时刻分别阅读。`}前段依据：${last.link.reason}后段依据：${piece.link.reason}`
              : `${sameCaption ? `总体仍为“${piece.link.caption}”，${axisChanges.join("；") || "具体条件改变"}。` : `由“${last.link.caption}”转为“${piece.link.caption}”。`}前段依据：${last.link.reason}后段依据：${piece.link.reason}`,
            before: last.link, after: piece.link, conditions: unique([...last.link.conditions, ...piece.link.conditions]), evidence: unique([...last.link.evidence, ...piece.link.evidence, ...axisChanges]) });
        }
      }
      last = piece;
    }
    const branchStages = stages.filter((item) => item.branchId === id), reference = life ? instant(life.referenceInstant) : null;
    const currentIndex = reference === null ? -1 : branchStages.findIndex((item) => instant(item.startInstant) <= reference && reference < instant(item.endExclusiveInstant));
    branches.push({ id, label: branchLabel(id), stageIds: branchStages.map((item) => item.id), turningPointIds: turningPoints.filter((item) => item.branchId === id).map((item) => item.id),
      currentStageId: currentIndex >= 0 ? branchStages[currentIndex]!.id : null, nextStageId: currentIndex >= 0 ? branchStages[currentIndex + 1]?.id ?? null : null,
      narrative: branchNarrative(id, annual.startYear, annual.endYear, branchStages, turningPoints.filter((point) => point.branchId === id), gaps.filter((gap) => gap.branchId === id), ordered),
      conditions: unique([...(id !== "locked" ? ["本分支与另一个顺逆条件平行展示，不按顺序串联，也不合并投票。"] : []), ...(!life ? ["大运阶段定位尚未提供，未指定当前阶段。"] : currentIndex < 0 ? ["定位时刻不在本年度窗口的已有阶段内，未以最近年份冒充当前阶段。"] : []), ...gaps.filter((gap) => gap.branchId === id).map((gap) => gap.message)]) });
  }
  return { version: LOCAL_READING_TIMELINE_VERSION, sourceBinding: binding, startYear: annual.startYear, endYear: annual.endYear,
    sourceVersions: unique(versions), lifeReferenceInstant: life?.referenceInstant ?? null,
    headline: `${annual.startYear}—${annual.endYear}年的阶段与变化`,
    summary: branches.map((branch) => `${branch.label}：${branch.stageIds.length ? `${branch.stageIds.length}个连续作用阶段，${branch.turningPointIds.length}处已有判断或交运变化。` : "当前没有完整可读阶段，缺失原因单独保留。"}`).join(" "),
    branches, stages, turningPoints, gaps,
    limitations: ["阶段只合并时间连续、同一大运背景及相同核心三轴作用的已有判断；不是新评分或吉凶预测。", "同方向年份仍有不同作用对象；交运不等于转好，判断变化不等于已经发生的现实事件。", "日期按固定UTC+08展示，实际区间保持原始半开瞬时边界。", ...(!includeHour ? ["本命时柱未纳入既有判断；本层不补回未知时柱。"] : [])] };
}
