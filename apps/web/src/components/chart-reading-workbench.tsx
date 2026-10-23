import { ArrowRight, BookOpen, BriefcaseBusiness, Check, ChevronDown, ChevronRight, Database, FileDown, HeartHandshake, Leaf, LoaderCircle, PencilLine, Plus, Save, Waves } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment, PreliminaryReading, PreliminarySection, PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import type { LocalAnnualOutlook } from "../lib/local-annual-outlook";
import type { LocalLifeOutlook } from "../lib/local-detailed-outlook";
import type { LocalReadingTimeline } from "../lib/local-reading-timeline";
import { ReadingPeriodSummary } from "./reading-period-summary";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { ComprehensiveReadingPanel } from "./comprehensive-reading-panel";
import { PersonalReadingScope } from "./personal-reading-note";
import { annualHandoverPresentation } from "../lib/outlook-judgment-presentation";
import type { LocalReadingSynthesis } from "../lib/local-reading-synthesis";
import type { LocalReadingPriorities } from "../lib/local-reading-priorities";
import { ReadingSynthesisPanel } from "./reading-synthesis-panel";
import { ReadingPrioritiesPanel } from "./reading-priorities-panel";
import { RelationshipWindowsPanel } from "./relationship-windows-panel";
import type { LocalReadingAnnualEvents } from "../lib/local-annual-event-record";
import type { LocalReadingAnnualLifeStories } from "../lib/annual-life-story";
import type { AnnualAnswerPersonalSources } from "../lib/annual-answer-navigation";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import { AppLink } from "../lib/router";
import { buildPlainNatalCards } from "../lib/plain-natal-summary";
import { plainOutlookCaption } from "../lib/plain-outlook-reading";
import { plainYearCaption, plainYearSummary } from "../lib/plain-year-overview";
import { PlainYearOverviewPanel } from "./plain-year-overview-panel";
import type { BriefReadingReport } from "../lib/brief-reading-report";
import { BriefReadingReportPanel } from "./brief-reading-report-panel";
import { revealReadingSection } from "./reading-section-navigation";
import { buildReadingFeedbackChoices, FEEDBACK_RATINGS, type FeedbackRating, type ReadingFeedbackDraft, type ReadingFeedbackChoice } from "../lib/local-reading-feedback";
import "./chart-reading-workbench.css";

export type { ReadingFeedbackDraft, ReadingFeedbackChoice } from "../lib/local-reading-feedback";

export interface ChartReadingWorkbenchProps {
  revision: RevisionRecord;
  caseName: string;
  assessment: BaziPreliminaryAssessment;
  comprehensive?: BaziComprehensiveReading | null;
  synthesis?: LocalReadingSynthesis | null;
  briefReport?: BriefReadingReport | null;
  explanationPanel?: ReactNode;
  onPrepareCompleteReading?: () => void;
  priorities?: LocalReadingPriorities | null;
  annualEvents?: LocalReadingAnnualEvents | null;
  annualLifeStories?: LocalReadingAnnualLifeStories | null;
  annualLifeStoryPersonalSources?: AnnualAnswerPersonalSources;
  extraFeedbackChoices?: ReadingFeedbackChoice[];
  feedbackTarget?: { id: string; requestId: number } | null;
  reportLoading?: boolean;
  onExportReading?: () => void;
  onExportArchive?: () => void;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
  annualOutlook?: LocalAnnualOutlook | null;
  lifeOutlook?: LocalLifeOutlook | null;
  timeline?: LocalReadingTimeline | null;
  annualLoading?: boolean;
  annualError?: string | null;
  onSaveReading?: () => void | Promise<void>;
  onAddFeedback?: (feedback: ReadingFeedbackDraft) => void | Promise<void>;
  onEditBirthData?: () => void;
  onOpenDetails?: () => void;
  onOpenTransit?: () => void;
  decorativeImageUrl?: string;
}

type ReadingTopic = "self" | "career" | "relationship";
type ReadingAxis = "pattern" | "balance" | "seasonal";
const PILLARS = ["year", "month", "day", "hour"] as const;
const ELEMENTS: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const SYMBOL_ELEMENT: Record<string, string> = {
  甲: "wood", 乙: "wood", 寅: "wood", 卯: "wood",
  丙: "fire", 丁: "fire", 巳: "fire", 午: "fire",
  戊: "earth", 己: "earth", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth",
  庚: "metal", 辛: "metal", 申: "metal", 酉: "metal",
  壬: "water", 癸: "water", 亥: "water", 子: "water"
};
const TOPICS: readonly { id: ReadingTopic; label: string }[] = [
  { id: "self", label: "总览" }, { id: "career", label: "事业与处事" }, { id: "relationship", label: "关系与相处" }
];
const AXES: readonly { id: ReadingAxis; label: string }[] = [
  { id: "pattern", label: "格局" }, { id: "balance", label: "扶抑" }, { id: "seasonal", label: "调候" }
];
const STATUS_LABELS = { supported: "当前判断", conditional: "结合条件", conflicting: "存在分歧", not_covered: "尚未覆盖" } as const;
const text = (value: unknown, fallback = "", limit = 1_600) => safeVisibleText(value, fallback, limit);

function sourceUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function SourceNotes({ sourceIds, sources }: { sourceIds: readonly string[]; sources: readonly PreliminarySource[] }) {
  const selected = sources.filter((source) => sourceIds.includes(source.id));
  if (!selected.length) return null;
  return <div className="reading-source-notes">{selected.map((source) => <div key={source.id}>
    <p className="reading-source-title">{sourceUrl(source.url)
      ? <a href={sourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{text(source.title)} <ArrowRight size={13} aria-hidden="true" /></a>
      : text(source.title)}</p>
    {source.excerpt ? <blockquote>{text(source.excerpt)}</blockquote> : null}
    <p>{text(source.interpretation)}</p>
    <small>{text(source.locator)}</small>
    {source.provenance && sourceUrl(source.provenance.licenseUrl) ? source.provenance.kind === "facsimile_page"
      ? <p>影印大字原文：国图藏本{source.provenance.facsimile ? <> · PDF 第 {source.provenance.facsimile.pdfPageOneBased} 页（书内{text(source.provenance.facsimile.printedPage)}）</> : null} · <a href={sourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">影印来源与权利说明</a></p>
      : <p>原文转录：维基文库贡献者 · <a href={sourceUrl(source.provenance.licenseUrl)} target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>
      : null}
  </div>)}</div>;
}

function EvidenceList({ items }: { items: readonly string[] }) {
  return items.length ? <ul className="reading-evidence-list">{items.map((item, index) => <li key={`${index}-${item}`}>{text(item)}</li>)}</ul> : null;
}

function ReadingCard({ reading, sources }: { reading: PreliminaryReading; sources: readonly PreliminarySource[] }) {
  const Icon = reading.topic === "career" ? BriefcaseBusiness : reading.topic === "relationship" ? HeartHandshake : reading.topic === "long_term" ? PencilLine : Database;
  const tenGod = reading.title.split("·").at(-1)?.trim() ?? "";
  const plainTitles: Record<string, string> = { 正财: "重视经营与责任", 偏财: "留意机会与人情往来", 伤官: "重视独立表达", 食神: "通过持续产出积累成果", 正官: "重视秩序与承诺", 七杀: "在压力中寻求突破", 正印: "重视学习与支持", 偏印: "偏好独立钻研", 比肩: "重视自主与同伴", 劫财: "关注合作与资源分配" };
  const opening = reading.text.split("。")[0];
  return <article className={`reading-insight reading-insight--${reading.topic}`}>
    <span className="reading-insight-icon" aria-hidden="true"><Icon size={29} strokeWidth={1.7} /></span>
    <div className="reading-insight-copy">
      <PersonalReadingScope subjectId={`preliminary-${reading.id}`}>
      <h3>{text(plainTitles[tenGod] ?? reading.title)}</h3>
      <p>{text(opening ? `${opening}。` : reading.text)}</p>
      <details className="reading-inline-evidence">
        <summary>查看对应命盘依据 <ArrowRight size={16} aria-hidden="true" /></summary>
        <p>{text(reading.text)}</p>
        <EvidenceList items={reading.evidence} />
        <SourceNotes sourceIds={reading.sourceIds} sources={sources} />
      </details>
      </PersonalReadingScope>
    </div>
  </article>;
}

function AssessmentDetails({ axis, assessment, comprehensive }: { axis: ReadingAxis; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading | null }) {
  const working = getWorkingBalance(assessment);
  const structure = axis === "pattern" && comprehensive?.patternDiagnosis ? comprehensive.chapters.find((chapter) => chapter.id === "structure") : undefined;
  const section: PreliminarySection = axis === "balance" ? { status: "supported", headline: `当前旺衰判断 · ${working.label}`,
    summary: working.summary, evidence: working.evidence, conditions: working.conditions, sourceIds: working.sourceIds }
    : structure ? { status: assessment.pattern.status, headline: structure.headline, summary: structure.verdict,
      evidence: structure.evidence, conditions: comprehensive!.patternDiagnosis!.conditions, sourceIds: structure.sourceIds } : assessment[axis];
  const sources = [...new Map([...assessment.sources, ...(comprehensive?.sources ?? [])].map((source) => [source.id, source])).values()];
  return <div className="reading-axis-copy">
    <PersonalReadingScope subjectId={structure ? "chapter-structure" : `preliminary-preliminary-${axis}`}>
    <h3>{text(section.headline)}</h3>
    <p>{text(section.summary)}</p>
    {axis === "balance" ? <dl className="reading-element-directions">
      <div><dt>当前扶抑参考</dt><dd>{working.favorableElements.map((element) => ELEMENTS[element]).join("、") || "不作固定喜用"}</dd></div>
      <div><dt>当前较需留意</dt><dd>{working.unfavorableElements.map((element) => ELEMENTS[element]).join("、") || "随条件判断"}</dd></div>
    </dl> : null}
    {!structure ? <EvidenceList items={section.conditions} /> : null}
    <details className="reading-inline-evidence">
      <summary>展开判断依据与出处 <ChevronDown size={16} aria-hidden="true" /></summary>
      {structure ? <EvidenceList items={section.conditions} /> : null}
      <EvidenceList items={section.evidence} />
      <SourceNotes sourceIds={section.sourceIds} sources={sources} />
      {axis === "balance" ? <details className="reading-inline-evidence"><summary>原计权对照</summary>
        <p>{text(assessment.balance.baselineSummary)}</p><p>{text(assessment.balance.sensitivitySummary)}</p>
        <EvidenceList items={assessment.balance.evidence} /><EvidenceList items={assessment.balance.conditions} />
        <SourceNotes sourceIds={assessment.balance.sourceIds} sources={assessment.sources} />
      </details> : null}
    </details>
    </PersonalReadingScope>
  </div>;
}

function FeedbackForm({ assessment, annual, choices, target, onAddFeedback }: { assessment: BaziPreliminaryAssessment; annual: LocalAnnualOutlook | null; choices: ReadingFeedbackChoice[]; target?: ChartReadingWorkbenchProps["feedbackTarget"]; onAddFeedback: NonNullable<ChartReadingWorkbenchProps["onAddFeedback"]> }) {
  const formId = useId();
  const options = buildReadingFeedbackChoices(assessment, annual, choices);
  const [selected, setSelected] = useState<ReadingFeedbackChoice>(() => options[0]!);
  const originalConclusion = selected.originalConclusion;
  const available = options.some((choice) => choice.id === selected.id && choice.originalConclusion === originalConclusion
    && JSON.stringify(choice.sourceVersions ?? []) === JSON.stringify(selected.sourceVersions ?? []));
  const [actualSituation, setActualSituation] = useState("");
  const [rating, setRating] = useState<FeedbackRating>("unverified");
  const [aspect, setAspect] = useState(""), [occurredAt, setOccurredAt] = useState(""), [requestedRevision, setRequestedRevision] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const handledTarget = useRef<number | null>(null);
  useEffect(() => {
    if (!target || handledTarget.current === target.requestId || pending) return;
    handledTarget.current = target.requestId;
    const choice = options.find((item) => item.id === target.id);
    if (!choice) { setFailed(true); setMessage("这项解读已变化，请重新选择；已填写内容保留。"); return; }
    setSelected({ ...choice }); setFailed(false);
    setMessage("已选中这项解读；已填写内容保留，请核对后提交。");
  }, [target, options, pending]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!available || !originalConclusion.trim()) {
      setFailed(true); setMessage("原结论选项已变化，请重新选择后保存；输入内容已保留。"); return;
    }
    if ((rating !== "unverified" && !actualSituation.trim()) || (["partial", "mismatch"].includes(rating) && !aspect.trim())) {
      setFailed(true); setMessage("请填写真实情况；部分符合或不符合时，请说明具体哪方面不同。"); return;
    }
    busy.current = true; setPending(true); setMessage(""); setFailed(false);
    try {
      await onAddFeedback({ originalConclusion, actualSituation, subjectId: selected.id, subjectLabel: selected.label, sourceVersions: selected.sourceVersions,
        rating, aspect, occurredAt, requestedRevision });
      setActualSituation(""); setAspect(""); setOccurredAt(""); setRequestedRevision(""); setRating("unverified"); setMessage("反馈已保存，可在解读记录中追加复核或个人修订。");
    } catch (error) {
      setFailed(true); setMessage(safeVisibleErrorMessage(error, "反馈暂未保存，内容已保留。请先到解读记录核对。"));
    } finally { busy.current = false; setPending(false); }
  }
  return <section className="reading-feedback" id="reading-feedback" tabIndex={-1} aria-labelledby={`${formId}-title`}>
    <div className="reading-section-heading"><h2 id={`${formId}-title`}>本次反馈</h2><span>保留原结论，逐次补充与复核</span></div>
    <form onSubmit={(event) => { void submit(event); }}>
      <label htmlFor={`${formId}-conclusion`}>要反馈的原结论</label>
      <select id={`${formId}-conclusion`} value={available ? selected.id : ""} onChange={(event) => { const choice = options.find((item) => item.id === event.target.value); if (choice) setSelected({ ...choice }); setMessage(""); }} disabled={pending}>
        {!available ? <option value="" disabled>原选项已变化，请重新选择</option> : null}
        {options.map((choice) => <option key={choice.id} value={choice.id}>{text(choice.label)}</option>)}
      </select>
      <p className="reading-feedback-quote">{text(originalConclusion, "", 4_000)}</p>
      {!available ? <p role="alert">当前年份或结论已变化，请重新选择；已填写的经历仍保留。</p> : null}
      <fieldset className="reading-feedback-ratings" disabled={pending}><legend>与实际情况是否符合</legend>
        {Object.entries(FEEDBACK_RATINGS).map(([value, label]) => <label key={value}><input type="radio" name={`${formId}-rating`} value={value} checked={rating === value} onChange={() => setRating(value as FeedbackRating)} />{label}</label>)}
      </fieldset>
      <div className="reading-feedback-fields"><div><label htmlFor={`${formId}-aspect`}>具体哪方面符合或不同</label><input id={`${formId}-aspect`} value={aspect} maxLength={2000} required={rating === "partial" || rating === "mismatch"} disabled={pending} onChange={(event) => setAspect(event.target.value)} placeholder="如事业方向符合，但时间或承压程度不同" /></div>
        <div><label htmlFor={`${formId}-time`}>对应时间（可填年份、月份或阶段）</label><input id={`${formId}-time`} value={occurredAt} maxLength={300} disabled={pending} onChange={(event) => setOccurredAt(event.target.value)} placeholder="如 2026 年春季，或大学期间" /></div></div>
      <label htmlFor={`${formId}-actual`}>实际情况</label>
      <div className="reading-feedback-entry">
        <textarea id={`${formId}-actual`} value={actualSituation} onChange={(event) => { setActualSituation(event.target.value); setMessage(""); }} placeholder={rating === "unverified" ? "尚未验证可暂不填写，不需要编造经历。" : "写下真实发生的情况，以及它与原结论的差别。"} maxLength={8_000} rows={3} required={rating !== "unverified"} disabled={pending} />
      </div>
      <label htmlFor={`${formId}-request`}>希望如何修订（可选）</label><textarea className="reading-feedback-request" id={`${formId}-request`} value={requestedRevision} onChange={(event) => setRequestedRevision(event.target.value)} maxLength={4000} rows={3} disabled={pending} placeholder="可以提出更符合实际的表述，也可先保存经历，以后再补个人修订。" />
      <div className="reading-feedback-entry">
        <button className="reading-button reading-button--secondary" type="submit" disabled={pending || !available || (rating !== "unverified" && !actualSituation.trim()) || (["partial", "mismatch"].includes(rating) && !aspect.trim())}>
          {pending ? <LoaderCircle size={18} className="reading-spinner" aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          {pending ? "正在保存" : "添加反馈"}
        </button>
      </div>
      <p className="reading-feedback-scope">反馈保存为个人记录，原结论和版本不变；后续复核不会自动训练模型或修改通用规则。<a href="#reading-records">查看反馈与复核记录</a></p>
      <p className={`reading-action-message${failed ? " reading-action-message--error" : ""}`} role={failed ? "alert" : "status"}>{message}</p>
    </form>
  </section>;
}

function ReadingWorkbenchContent({ revision, caseName, assessment, comprehensive, synthesis, briefReport, explanationPanel, onPrepareCompleteReading, priorities, annualEvents, annualLifeStories, annualLifeStoryPersonalSources, extraFeedbackChoices = [], feedbackTarget, reportLoading = false, onExportReading, onExportArchive, selectedYear: controlledYear, onSelectYear, annualOutlook, lifeOutlook, timeline, annualLoading = false, annualError, onSaveReading, onAddFeedback, onEditBirthData, onOpenDetails, onOpenTransit, decorativeImageUrl }: ChartReadingWorkbenchProps) {
  const sectionId = useId();
  const [topic, setTopic] = useState<ReadingTopic>("self");
  const [axis, setAxis] = useState<ReadingAxis | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saved" | "failed">("idle");
  const [saveError, setSaveError] = useState("");
  const [completeNatalOpen, setCompleteNatalOpen] = useState(false);
  const [completeYearsOpen, setCompleteYearsOpen] = useState(false);
  const [backgroundRequested, setBackgroundRequested] = useState(false);
  const [backgroundHasMounted, setBackgroundHasMounted] = useState(false);
  const [backgroundTarget, setBackgroundTarget] = useState<{ id: string } | null>(null);
  const backgroundRef = useRef<HTMLDetailsElement>(null);
  const saveBusy = useRef(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const includeHour = assessment.sourceBinding.includeHour;
  const workingBalance = getWorkingBalance(assessment);
  const pillars = revision.facts.pillars;
  const readings = assessment.readings.filter((reading) => topic === "self"
    ? reading.id === "preliminary-pillar-month" || reading.topic === (includeHour ? "long_term" : "self")
    : reading.topic === topic);
  const boundAnnual = annualOutlook?.revisionId === revision.id && annualOutlook.chartResultHash === revision.manifest.resultHash ? annualOutlook : null;
  const boundLife = lifeOutlook?.revisionId === revision.id && lifeOutlook.chartResultHash === revision.manifest.resultHash ? lifeOutlook : null;
  const boundTimeline = timeline?.sourceBinding.revisionId === revision.id && timeline.sourceBinding.chartResultHash === revision.manifest.resultHash
    && timeline.sourceBinding.includeHour === assessment.sourceBinding.includeHour && boundAnnual?.startYear === timeline.startYear && boundAnnual.endYear === timeline.endYear ? timeline : null;
  const selectedYear = boundAnnual?.years.find((item) => item.year === (controlledYear ?? year)) ?? boundAnnual?.years[0];
  const boundComprehensive = comprehensive?.sourceBinding.revisionId === revision.id && comprehensive.sourceBinding.chartResultHash === revision.manifest.resultHash && comprehensive.sourceBinding.includeHour === assessment.sourceBinding.includeHour ? comprehensive : null;
  const structureChapter = boundComprehensive?.patternDiagnosis ? boundComprehensive.chapters.find((chapter) => chapter.id === "structure") : undefined;
  const boundSynthesis = synthesis?.sourceBinding.caseId === revision.caseId && synthesis.sourceBinding.revisionId === revision.id
    && synthesis.sourceBinding.chartResultHash === revision.manifest.resultHash && synthesis.sourceBinding.includeHour === assessment.sourceBinding.includeHour ? synthesis : null;
  const boundPriorities = priorities?.sourceBinding.revisionId === revision.id && priorities.sourceBinding.chartResultHash === revision.manifest.resultHash
    && priorities.sourceBinding.includeHour === assessment.sourceBinding.includeHour && boundAnnual?.startYear === priorities.startYear
    && boundAnnual.endYear === priorities.endYear ? priorities : null;
  const boundBrief = briefReport?.sourceBinding.caseId === revision.caseId && briefReport.sourceBinding.revisionId === revision.id
    && briefReport.sourceBinding.chartResultHash === revision.manifest.resultHash && briefReport.sourceBinding.includeHour === assessment.sourceBinding.includeHour
    && (!boundAnnual || (briefReport.coverage.fromYear === boundAnnual.startYear && briefReport.coverage.toYear === boundAnnual.endYear)) ? briefReport : null;
  // Keep the fallback reader visible once initial preparation finishes. In the
  // main-report flow, this large subtree mounts only after an explicit request.
  // Once mounted it stays mounted so nested year comparisons retain their state.
  const mountBackground = backgroundHasMounted || (!reportLoading && (backgroundRequested || !boundBrief));
  const backgroundAnchors = useMemo(() => new Set(["reading-full-report", ...(boundSynthesis?.sections.map(section => `reading-${section.id}`) ?? [])]), [boundSynthesis]);
  const requestBackground = useCallback((id: string) => {
    if (!backgroundAnchors.has(id)) return;
    setBackgroundRequested(true); setBackgroundTarget({ id });
    if (backgroundRef.current) backgroundRef.current.open = true;
  }, [backgroundAnchors]);
  useEffect(() => { if (mountBackground && !backgroundHasMounted) setBackgroundHasMounted(true); }, [mountBackground, backgroundHasMounted]);
  useEffect(() => {
    const followHash = () => { try { requestBackground(decodeURIComponent(window.location.hash.slice(1))); } catch { /* Leave malformed hashes untouched. */ } };
    followHash(); window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [requestBackground]);
  useEffect(() => {
    if (!mountBackground || !backgroundTarget) return;
    const target = revealReadingSection(backgroundTarget.id);
    target?.scrollIntoView?.({ block: "start" });
    if (target?.hasAttribute("tabindex")) target.focus({ preventScroll: true });
  }, [mountBackground, backgroundTarget]);
  const month = pillars.month;
  const secondary = includeHour ? pillars.hour : pillars.year;
  const seasonalScope = assessment.sources.find((source) => assessment.seasonal.sourceIds.includes(source.id))?.provenance?.scope;
  const seasonalLabel = assessment.seasonal.coverage !== "checked_classic_clause" ? "季节观察"
    : seasonalScope === "season" ? "古籍季节总论" : seasonalScope === "month_group" ? "古籍合论"
      : seasonalScope === "phase" ? "古籍阶段条件" : seasonalScope === "month" ? "古籍月令段" : "古籍条文";

  async function saveReading() {
    if (!onSaveReading || saveBusy.current) return;
    saveBusy.current = true; setSaveState("pending"); setSaveError("");
    try { await onSaveReading(); setSaveState("saved"); }
    catch (error) { setSaveState("failed"); setSaveError(safeVisibleErrorMessage(error, "解读暂未保存，请先到解读记录核对。")); }
    finally { saveBusy.current = false; }
  }
  function topicKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % TOPICS.length;
    else if (event.key === "ArrowLeft") next = (index + TOPICS.length - 1) % TOPICS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TOPICS.length - 1;
    else return;
    event.preventDefault(); setTopic(TOPICS[next]!.id); tabRefs.current[next]?.focus();
  }

  return <section className="chart-reading-workbench" aria-label="命盘与本地解读" onClickCapture={event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
    if (link) { try { requestBackground(decodeURIComponent(link.getAttribute("href")!.slice(1))); } catch { /* Keep native navigation. */ } }
  }}>
    <header className="reading-workbench-header">
      <div className="reading-case-heading"><strong>{text(caseName, "我的命盘", 120)}</strong><span>{revision.input.calendarType === "lunar" ? "农历 " : ""}{text(revision.input.date)} {includeHour ? text(revision.input.time) : "时辰未定"}</span><span>{text(revision.input.timeZone)}</span></div>
      <div className="reading-header-actions">
        {onEditBirthData ? <button className="reading-button reading-button--secondary" type="button" onClick={onEditBirthData}><PencilLine size={17} aria-hidden="true" />编辑资料</button> : null}
        {onExportReading ? <button className="reading-button reading-button--secondary" type="button" disabled={reportLoading} onClick={onExportReading}><FileDown size={17} aria-hidden="true" />导出完整解读</button> : null}
        {onExportArchive ? <button className="reading-button reading-button--secondary" type="button" disabled={reportLoading} onClick={onExportArchive}><FileDown size={17} aria-hidden="true" />导出完整依据</button> : null}
        {onSaveReading ? <button className="reading-button reading-button--primary" type="button" disabled={saveState === "pending" || reportLoading} onClick={() => { void saveReading(); }}>
          {saveState === "pending" ? <LoaderCircle size={18} className="reading-spinner" aria-hidden="true" /> : saveState === "saved" ? <Check size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          {saveState === "pending" ? "正在保存" : saveState === "saved" ? "已保存解读" : "保存解读"}
        </button> : null}
      </div>
      {saveState === "failed" ? <p className="reading-save-error" role="alert">{saveError}</p> : null}
      {saveState === "saved" ? <p className="reading-save-message" role="status">解读已保存到本机。<AppLink href={`/reports?case=${encodeURIComponent(revision.caseId)}`}>打开我的报告</AppLink></p> : null}
      {reportLoading ? <p className="reading-save-message" role="status">正在整理大运与流月，完成后可保存完整解读。</p> : null}
    </header>

    <div className="reading-workbench-columns">
      <aside className="reading-chart-column" aria-label="命盘结构与运势">
        <section className="reading-pillars-section" aria-labelledby={`${sectionId}-pillars`}>
          <div className="reading-section-heading reading-section-heading--calendar"><h2 id={`${sectionId}-pillars`}>四柱命盘</h2><div><p>{text(revision.facts.calendar.solarText)}</p><p>{text(revision.facts.calendar.lunarText)}</p><p>时区 {text(revision.input.timeZone)}</p></div></div>
          <table className="reading-pillars"><caption className="sr-only">四柱天干、地支与五行</caption><thead><tr>{PILLARS.map((position) => <th key={position} scope="col">{pillars[position].label}</th>)}</tr></thead>
            <tbody><tr className="reading-pillar-stems">{PILLARS.map((position) => <td key={position} className={`reading-element--${SYMBOL_ELEMENT[pillars[position].stem] ?? "unknown"}`}>{position === "hour" && !includeHour ? "—" : pillars[position].stem}</td>)}</tr>
              <tr className="reading-pillar-branches">{PILLARS.map((position) => <td key={position} className={`reading-element--${SYMBOL_ELEMENT[pillars[position].branch] ?? "unknown"}`}>{position === "hour" && !includeHour ? "—" : pillars[position].branch}</td>)}</tr>
              <tr className="reading-pillar-elements">{PILLARS.map((position) => <td key={position}>{position === "hour" && !includeHour ? "待定" : <>{ELEMENTS[SYMBOL_ELEMENT[pillars[position].stem] ?? ""]} <span>{ELEMENTS[SYMBOL_ELEMENT[pillars[position].branch] ?? ""]}</span></>}</td>)}</tr></tbody>
          </table>
          {!includeHour ? <p className="reading-small-note">时辰未定，本次解读不使用时柱作判断。</p> : null}
        </section>

        <details className="reading-clues reading-fold">
          <summary>查看月令、透干与藏干线索</summary>
          <div className="reading-clue"><span className="reading-clue-icon"><Leaf size={25} aria-hidden="true" /></span><div><h3>{month.stem}{ELEMENTS[SYMBOL_ELEMENT[month.stem] ?? ""]}透月干 · {text(month.stemTenGod)}</h3><p>月令{month.branch}，藏干{month.hiddenStems.join("、")}。{text(assessment.pattern.background)}</p></div></div>
          <div className="reading-clue"><span className="reading-clue-icon reading-clue-icon--water"><Waves size={25} aria-hidden="true" /></span><div><h3>{secondary.stem}{ELEMENTS[SYMBOL_ELEMENT[secondary.stem] ?? ""]}透{includeHour ? "时" : "年"}干 · {text(secondary.stemTenGod)}</h3><p>{includeHour ? "时" : "年"}支{secondary.branch}，藏干{secondary.hiddenStems.join("、")}；与日主的关系为{text(secondary.stemTenGod)}。</p></div></div>
        </details>

        <details className="reading-fold reading-pillar-details"><summary><span>更多命盘细节</span><small>藏干、十神与纳音</small><ChevronRight size={18} aria-hidden="true" /></summary><div className="reading-pillar-detail-grid">{PILLARS.filter((position) => includeHour || position !== "hour").map((position) => <div key={position}><h3>{pillars[position].label} · {pillars[position].ganZhi}</h3><dl><div><dt>十神</dt><dd>{text(pillars[position].stemTenGod, "—")}</dd></div><div><dt>藏干</dt><dd>{pillars[position].hiddenStems.join("、")}</dd></div><div><dt>纳音</dt><dd>{text(pillars[position].nayin, "—")}</dd></div><div><dt>长生</dt><dd>{text(pillars[position].twelveGrowth, "—")}</dd></div></dl></div>)}</div>
          {onOpenDetails ? <button className="reading-text-button" type="button" onClick={onOpenDetails}>查看完整命盘 <ArrowRight size={15} aria-hidden="true" /></button> : null}
        </details>

        <section className="reading-annual" aria-labelledby={`${sectionId}-annual`} aria-busy={annualLoading}>
          <div className="reading-section-heading"><h2 id={`${sectionId}-annual`}>大运流年</h2>{onOpenTransit ? <button className="reading-button reading-button--outline" type="button" onClick={onOpenTransit}>查看大运</button> : null}</div>
          {selectedYear && boundAnnual ? <>
            <div className="reading-year-picker"><label htmlFor={`${sectionId}-year`}>查看流年</label><select id={`${sectionId}-year`} value={selectedYear.year} onChange={(event) => { const next = Number(event.target.value); setYear(next); onSelectYear?.(next); }}>{boundAnnual.years.map((item) => <option key={item.year} value={item.year}>{item.year}年 · {item.yearGanZhi ?? "年份待定"}</option>)}</select><span className="reading-year-label">{plainYearCaption(selectedYear)}</span></div>
            <PersonalReadingScope subjectId={`annual-${selectedYear.year}`}>
            <p className="reading-annual-summary">{text(plainYearSummary(selectedYear))}</p>
            <details className="reading-inline-evidence"><summary>这一年的主题与依据 <ChevronDown size={16} aria-hidden="true" /></summary>
              <dl className="reading-year-influences">
                <div><dt>仅看流年扶抑</dt><dd>{text(selectedYear.yearInfluence.summary)}</dd></div>
                <div><dt>仅看大运扶抑</dt><dd>{text(selectedYear.decadeInfluence.summary)}</dd></div>
              </dl>
              <EvidenceList items={selectedYear.yearInfluence.evidence} />
              <EvidenceList items={selectedYear.decadeInfluence.evidence} />
              {selectedYear.themes.map((theme) => <div className="reading-year-theme" key={theme.id}><h3>{text(theme.title)}</h3><p>{text(theme.text)}</p><EvidenceList items={theme.evidence} /></div>)}
              <EvidenceList items={selectedYear.evidence} />
              <EvidenceList items={selectedYear.conditions} />
              {selectedYear.scenarioBranches.map((scenario) => <div className="reading-year-theme" key={scenario.id}><h3>{text(scenario.label)}</h3><p>{text(scenario.summary)}</p><EvidenceList items={scenario.evidence} /></div>)}
              <p className="reading-small-note">{text(boundAnnual.yearBoundary)}</p>
            </details>
            </PersonalReadingScope>
          </> : <p className="reading-annual-summary" role="status">{annualLoading ? "正在本地整理所选年份的运势…" : annualError ? "流年暂时无法计算，仍可查看本命解读与大运。" : "结合大运与流年，继续查看不同阶段的变化。"}</p>}
          {decorativeImageUrl ? <img className="reading-mountain-art" src={decorativeImageUrl} alt="" aria-hidden="true" loading="lazy" /> : null}
        </section>
      </aside>

      <section className="reading-answer-column" id="reading-natal" tabIndex={-1} aria-labelledby={`${sectionId}-headline`}>
        <div className="reading-section-heading reading-answer-kicker"><h2>{boundBrief ? "主报告" : "本盘判断"}</h2><span>{boundBrief ? "先说结论，再看事业、财运、感情与年月" : "基于四柱结构的本地初步解读"}</span></div>
        <h1 id={`${sectionId}-headline`} className="reading-main-headline">{text(pillars.day.stem)}{ELEMENTS[SYMBOL_ELEMENT[pillars.day.stem] ?? ""]}日主 · {text(workingBalance.label)}</h1>
        {explanationPanel ? <>{explanationPanel}{boundBrief ? <details className="reading-fold" onToggle={event => setCompleteNatalOpen(event.currentTarget.open)}>
          <summary>展开完整本命阅读</summary>{completeNatalOpen ? <BriefReadingReportPanel report={boundBrief} variant="summary" onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /> : null}</details> : null}</>
          : boundBrief ? <BriefReadingReportPanel report={boundBrief} variant="summary" onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /> : boundSynthesis ? <ReadingSynthesisPanel reading={boundSynthesis} variant="summary" plainCards={buildPlainNatalCards(boundSynthesis, boundComprehensive, { revision, referenceInstant: boundLife?.referenceInstant })} />
          : <PersonalReadingScope subjectId={boundComprehensive ? "chapter-overview" : "natal-overview"}><p className="reading-main-summary">{text(boundComprehensive?.chapters.find((chapter) => chapter.id === "overview")?.verdict ?? assessment.pattern.summary)}</p></PersonalReadingScope>}
        {!boundBrief ? <div className="reading-now-overview" aria-label="当前阶段与所选年份">
          <section><span>当前大运</span>
            {boundLife?.decades.some((decade) => decade.isCurrent) ? boundLife.decades.filter((decade) => decade.isCurrent).map((decade) => <div key={decade.id}>
              <strong>{decade.ganZhi} · {decade.startYear}—{decade.endYear}</strong>
              {boundLife.branches.length > 1 ? <small>{decade.branchLabel}</small> : null}
              <PersonalReadingScope subjectId={`decade-${decade.id}`}><p>{plainOutlookCaption(decade.judgment)}</p></PersonalReadingScope>
            </div>) : <p>{boundLife?.summary ? text(boundLife.summary) : "正在整理当前阶段…"}</p>}
            <a href="#reading-life">看这步大运的变化<ArrowRight size={15} aria-hidden="true" /></a>
          </section>
          <section><span>{selectedYear ? `${selectedYear.year} 年重点` : "年份重点"}</span>
            {selectedYear ? <PersonalReadingScope subjectId={`annual-${selectedYear.year}`}><p>{text(plainYearSummary(selectedYear))}</p></PersonalReadingScope>
              : <p>{annualError ? "年份暂未读到，可继续看本命解读。" : "正在整理年度重点…"}</p>}
            <a href="#reading-yearly">看全年与月份<ArrowRight size={15} aria-hidden="true" /></a>
          </section>
        </div> : null}
        <details className="reading-fold reading-brief-axes"><summary>格局、喜用与判断依据</summary>
        {boundBrief?.natalConclusion ? <p className="reading-small-note">上方已给出本盘采用结论。以下保留原始格局、扶抑与调候条目，供展开对照。</p> : null}
        <div className="reading-axis-buttons" aria-label="三个判断角度">{AXES.map((item) => <button type="button" key={item.id} className={axis === item.id ? "is-active" : ""} aria-expanded={axis === item.id} aria-controls={`${sectionId}-axis`} onClick={() => setAxis((current) => current === item.id ? null : item.id)}><span>{item.label}<ChevronDown size={14} aria-hidden="true" /></span><strong>{text(item.id === "balance" ? workingBalance.label : item.id === "pattern" && structureChapter ? structureChapter.headline : assessment[item.id].headline)}</strong><small>{item.id === "seasonal" ? seasonalLabel : item.id === "balance" ? "当前工作判断" : structureChapter ? "格局主判断" : STATUS_LABELS[assessment[item.id].status]}</small></button>)}</div>
        <div id={`${sectionId}-axis`} hidden={axis === null}>{axis ? <AssessmentDetails axis={axis} assessment={assessment} comprehensive={boundComprehensive} /> : null}</div>
        </details>
        <a className="reading-full-report-link" href="#reading-full-report">{boundBrief ? "展开逐年判断与完整依据" : "继续读命局与重点年份"} <ArrowRight size={16} aria-hidden="true" /></a>
      </section>
    </div>
      <section className="reading-full-report" id="reading-full-report" tabIndex={-1} aria-label="命局详读与重点年份">
        {boundBrief && explanationPanel ? <details className="reading-fold" onToggle={event => { setCompleteYearsOpen(event.currentTarget.open); if (event.currentTarget.open) onPrepareCompleteReading?.(); }}>
          <summary>展开完整十年阅读与关键月份</summary>{completeYearsOpen ? <BriefReadingReportPanel report={boundBrief} variant="years" onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /> : null}</details>
          : boundBrief ? <BriefReadingReportPanel report={boundBrief} variant="years" onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /> : null}
        <details ref={backgroundRef} className="reading-fold reading-brief-background" open={!reportLoading && !boundBrief ? true : undefined}
          onToggle={event => { if (event.target === event.currentTarget && event.currentTarget.open) setBackgroundRequested(true); }}>
        <summary>展开命局详读、年份对照与原始依据</summary>
        {mountBackground ? <>
        {boundAnnual ? <PlainYearOverviewPanel annual={boundAnnual} expectedSource={{ ...assessment.sourceBinding, caseId: revision.caseId }} personalSources={annualLifeStoryPersonalSources} onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /> : null}
        {boundSynthesis ? <details className="reading-fold"><summary>展开完整命局说明与古籍依据</summary><ReadingSynthesisPanel reading={boundSynthesis} variant="sections" /></details> : null}
        {boundPriorities ? <><RelationshipWindowsPanel reading={boundPriorities} annualEvents={annualEvents?.sourceBinding.caseId === revision.caseId ? annualEvents : null} selectedYear={controlledYear ?? year ?? undefined} onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} />
          <details className="reading-fold"><summary>展开重点年份的原判断与细分事项</summary><ReadingPrioritiesPanel reading={boundPriorities} annualEvents={annualEvents?.sourceBinding.caseId === revision.caseId ? annualEvents : null}
            annualLifeStories={annualLifeStories?.sourceBinding.caseId === revision.caseId ? annualLifeStories : null}
            annualLifeStoryPersonalSources={annualLifeStoryPersonalSources}
            selectedYear={controlledYear ?? year ?? undefined} onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} /></details>
          <details className="reading-fold"><summary><span>展开完整阶段与交运脉络</span><ChevronDown size={16} aria-hidden="true" /></summary>
            <ReadingPeriodSummary life={boundLife} annual={boundAnnual} timeline={boundTimeline} onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} />
          </details></> : <ReadingPeriodSummary life={boundLife} annual={boundAnnual} timeline={boundTimeline} onSelectYear={(next) => { setYear(next); onSelectYear?.(next); }} />}
        {boundComprehensive ? <details className="reading-fold"><summary>展开命局九章与专业分析</summary><ComprehensiveReadingPanel reading={boundComprehensive} sources={assessment.sources} familyReading={boundSynthesis?.sections.find((section) => section.id === "family")} relationshipReading={boundSynthesis?.sections.find((section) => section.id === "relationships")} /></details> : <>
        <div className="reading-topic-tabs" role="tablist" aria-label="解读主题">{TOPICS.map((item, index) => <button key={item.id} id={`${sectionId}-tab-${item.id}`} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" aria-selected={topic === item.id} aria-controls={`${sectionId}-topic-panel`} tabIndex={topic === item.id ? 0 : -1} onClick={() => setTopic(item.id)} onKeyDown={(event) => topicKeyDown(event, index)}>{item.label}</button>)}</div>
        <div className="reading-topic-panel" id={`${sectionId}-topic-panel`} role="tabpanel" aria-labelledby={`${sectionId}-tab-${topic}`} tabIndex={0}>
          {readings.length ? readings.map((reading) => <ReadingCard key={reading.id} reading={reading} sources={assessment.sources} />) : <p className="reading-empty-topic">这个主题暂无单独的位置解读，可继续查看上方格局、扶抑与调候判断。</p>}
        </div>
        </>}
        <details className="reading-fold reading-method"><summary><span>判断口径与差异</span><small>适用范围与不同角度的可能差异</small><ChevronRight size={18} aria-hidden="true" /></summary><EvidenceList items={assessment.limitations} /><p>格局、扶抑与调候分别回答不同的问题；反馈用于保存和对照，不会自动修改这些判断规则。</p><SourceNotes sourceIds={assessment.sources.map((source) => source.id)} sources={assessment.sources} /></details>
        </> : <>
          {[...backgroundAnchors].filter(id => id !== "reading-full-report").map(id => <span key={id} id={id} data-reading-lazy-anchor="true" />)}
          {reportLoading ? <p role="status">正在整理完整阅读，准备后可展开本段。</p> : null}
        </>}
        </details>
        {onAddFeedback ? <details className="reading-fold" open={feedbackTarget ? true : undefined}><summary>这份判断有不符合的地方？填写反馈</summary><FeedbackForm assessment={assessment} annual={boundAnnual} choices={extraFeedbackChoices} target={feedbackTarget} onAddFeedback={onAddFeedback} /></details> : null}
        <p className="reading-endnote"><BookOpen size={13} aria-hidden="true" />传统命理解释，供个人参考。</p>
      </section>
  </section>;
}

export function ChartReadingWorkbench(props: ChartReadingWorkbenchProps) {
  if (props.assessment.sourceBinding.revisionId !== props.revision.id || props.assessment.sourceBinding.chartResultHash !== props.revision.manifest.resultHash) {
    return <section className="chart-reading-workbench"><p className="reading-binding-message" role="status">当前资料已变化，请等待对应命盘的解读。</p></section>;
  }
  return <ReadingWorkbenchContent key={`${props.revision.id}:${props.revision.manifest.resultHash}`} {...props} />;
}
