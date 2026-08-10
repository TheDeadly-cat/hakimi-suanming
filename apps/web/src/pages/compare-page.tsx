import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Columns3,
  GitCompareArrows,
  LoaderCircle,
  Plus,
  Save,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { calculateChart } from "@hakimi/bazi-core";
import {
  projectFormalComparison,
  type FormalComparisonProjection
} from "@hakimi/comparison-core";
import type {
  CaseRecord,
  FormalComparisonRequest,
  FormalComparisonSlotId,
  RevisionRecord
} from "@hakimi/contracts";
import { withDayBoundaryFromProfile } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { ComparisonModeNav } from "../components/comparison-mode-nav";
import { ComparisonMatrixTable, TransitComparisonTable } from "../components/formal-comparison-tables";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { useAppBootReady } from "../lib/app-boot-ready";
import { shortHash } from "../lib/format";
import {
  buildFormalComparisonDisplay,
  type FormalComparisonDisplayScope
} from "../lib/formal-comparison-display";
import {
  currentFormalComparisonUtcMinuteInstant,
  formalComparisonUtcMinute,
  parseFormalComparisonRoute,
  serializeFormalComparisonRoute,
  type FormalComparisonFocusSlotId
} from "../lib/formal-comparison-route";
import { AppLink, useAppLocation } from "../lib/router";

type CaseBundle = {
  caseRecord: CaseRecord;
  revisions: RevisionRecord[];
};

type SlotSelection = {
  selectionId: string;
  caseId: string | null;
  revisionId: string | null;
  manualDirection: "forward" | "backward" | null;
};

const SLOT_IDS = ["A", "B", "C", "D"] as const;
const COMPACT_COMPARISON_QUERY = "(max-width: 1099px)";
const GLOBAL_COMPARISON_SCOPE: FormalComparisonDisplayScope = { kind: "global" };
const CATEGORY_SHORT_LABELS = {
  input: "输入",
  calibration: "校时",
  rule: "规则",
  calendar_fact: "历法",
  pillar_fact: "四柱",
  evidence: "证据"
} as const;

function blankSlot(): SlotSelection {
  return {
    selectionId: crypto.randomUUID(),
    caseId: null,
    revisionId: null,
    manualDirection: null
  };
}

function slotLabel(index: number): FormalComparisonSlotId {
  return SLOT_IDS[index] ?? "D";
}

function revisionResearchHref(caseId: string, revisionId: string): string {
  return `/cases/${encodeURIComponent(caseId)}/revisions/${encodeURIComponent(revisionId)}?view=research`;
}

function activeCompareIndexForFocus(focusSlotId: FormalComparisonFocusSlotId): number {
  return SLOT_IDS.indexOf(focusSlotId);
}

function normalizedActiveCompareIndex(requestedIndex: number, itemCount: number): number {
  if (itemCount < 2) return 1;
  return Math.min(Math.max(requestedIndex, 1), itemCount - 1);
}

function focusSlotForIndex(index: number): FormalComparisonFocusSlotId {
  const slot = slotLabel(index);
  return slot === "C" || slot === "D" ? slot : "B";
}

function compactComparisonViewport(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.matchMedia === "function"
    ? window.matchMedia(COMPACT_COMPARISON_QUERY).matches
    : window.innerWidth <= 1099;
}

function useCompactComparisonViewport(): boolean {
  const [compact, setCompact] = useState(compactComparisonViewport);
  useEffect(() => {
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia(COMPACT_COMPARISON_QUERY)
      : null;
    const sync = () => setCompact(media?.matches ?? window.innerWidth <= 1099);
    sync();
    if (media) {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return compact;
}

function selectedRevision(slot: SlotSelection, bundles: ReadonlyMap<string, CaseBundle>): RevisionRecord | null {
  if (!slot.caseId || !slot.revisionId) return null;
  return bundles.get(slot.caseId)?.revisions.find((revision) => revision.id === slot.revisionId) ?? null;
}

function alternateBoundary(revision: RevisionRecord): "zi_start_23" | "midnight" {
  return revision.ruleProfile.calendar.dayBoundary === "zi_start_23" ? "midnight" : "zi_start_23";
}

export function ComparePage() {
  const appBootReady = useAppBootReady();
  const location = useAppLocation();
  const compactComparison = useCompactComparisonViewport();
  const fallbackAtInstant = useMemo(() => currentFormalComparisonUtcMinuteInstant(), []);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [bundles, setBundles] = useState<Map<string, CaseBundle>>(new Map());
  const [slots, setSlots] = useState<SlotSelection[]>(() => [blankSlot()]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [selectorBusy, setSelectorBusy] = useState(false);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [savingRuleVariant, setSavingRuleVariant] = useState(false);
  const [projection, setProjection] = useState<FormalComparisonProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [activeCompareIndex, setActiveCompareIndex] = useState(1);
  const [transitInput, setTransitInput] = useState(() => formalComparisonUtcMinute(fallbackAtInstant));
  const [transitInstant, setTransitInstant] = useState(fallbackAtInstant);
  const [routeSyncEnabled, setRouteSyncEnabled] = useState(false);
  const [acceptedSearch, setAcceptedSearch] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLibraryLoading(true);
      setError(null);
      setNotice(null);
      setProjection(null);
      setRouteSyncEnabled(false);
      setAcceptedSearch(null);
      const caseRowsPromise = caseRepository.listCases();
      try {
        const route = parseFormalComparisonRoute(location.search, fallbackAtInstant);
        const requestedCaseIds = [...new Set(route.slots.flatMap((slot) => slot.caseId ? [slot.caseId] : []))];
        const bundlesPromise = Promise.all(requestedCaseIds.map(async (caseId) => {
          const bundle = await caseRepository.getCase(caseId);
          if (!bundle) throw new Error(`链接中的案例 ${caseId} 已不存在。`);
          return bundle;
        }));
        const [caseRows, loaded] = await Promise.all([caseRowsPromise, bundlesPromise]);
        const loadedMap = new Map(loaded.map((bundle) => [bundle.caseRecord.id, bundle]));
        for (const slot of route.slots) {
          if (!slot.caseId || !slot.revisionId) continue;
          const bundle = loadedMap.get(slot.caseId);
          if (!bundle?.revisions.some((revision) => revision.id === slot.revisionId)) {
            throw new Error(`链接中的修订 ${slot.revisionId} 已不存在，未静默替换为最新修订。`);
          }
        }
        if (active) {
          setCases(caseRows);
          setBundles(loadedMap);
          setSlots(route.slots.map((slot) => ({ ...slot, selectionId: crypto.randomUUID() })));
          setTransitInput(formalComparisonUtcMinute(route.atInstant));
          setTransitInstant(route.atInstant);
          setActiveCompareIndex(activeCompareIndexForFocus(route.focusSlotId));
          setAcceptedSearch(location.search);
          setRouteSyncEnabled(true);
        }
      } catch (reason) {
        const caseRows = await caseRowsPromise;
        if (active) {
          setCases(caseRows);
          setBundles(new Map());
          setSlots([blankSlot()]);
          setTransitInput(formalComparisonUtcMinute(fallbackAtInstant));
          setTransitInstant(fallbackAtInstant);
          setActiveCompareIndex(1);
          setError(reason instanceof Error ? reason.message : "无法读取正式命盘对照来源。");
        }
      } finally {
        if (active) setLibraryLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [fallbackAtInstant, location.search]);

  const completeSlots = useMemo(() => slots.filter((slot) => slot.caseId && slot.revisionId), [slots]);
  const acceptedRoute = acceptedSearch === location.search;
  const displayActiveCompareIndex = normalizedActiveCompareIndex(
    activeCompareIndex,
    projection?.matrix.items.length ?? slots.length
  );
  const differenceScope = useMemo<FormalComparisonDisplayScope>(() => (
    compactComparison && projection
      ? { kind: "active_pair", compareIndex: displayActiveCompareIndex }
      : GLOBAL_COMPARISON_SCOPE
  ), [compactComparison, displayActiveCompareIndex, projection]);
  const comparisonDisplay = useMemo(() => projection
    ? buildFormalComparisonDisplay(projection.matrix, differenceScope)
    : null, [differenceScope, projection]);

  useEffect(() => {
    if (!acceptedRoute || completeSlots.length !== slots.length || completeSlots.length < 2) {
      setProjection(null);
      setProjectionLoading(false);
      return;
    }
    let active = true;
    const run = async () => {
      setProjectionLoading(true);
      setProjection(null);
      setError(null);
      try {
        const request: FormalComparisonRequest = {
          schemaVersion: "1.0.0",
          baselineSlotId: "A",
          slots: slots.map((slot, index) => ({
            slotId: slotLabel(index),
            caseId: slot.caseId!,
            revisionId: slot.revisionId!,
            manualDirection: slot.manualDirection
          })),
          transit: { mode: "same_instant", atInstant: transitInstant }
        };
        const sources = await caseRepository.readFormalComparisonSources(request);
        const next = await projectFormalComparison(request, sources);
        if (active) setProjection(next);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "正式命盘对照失败。");
      } finally {
        if (active) setProjectionLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [acceptedRoute, completeSlots.length, slots, transitInstant]);

  useEffect(() => {
    // A cold production boot binds its readiness proof to the exact URL that
    // was requested. Canonicalize only after that proof, or after a later
    // in-app interaction changes one of these dependencies.
    if (
      !appBootReady ||
      !routeSyncEnabled ||
      completeSlots.length !== slots.length
    ) return;
    try {
      const routeActiveCompareIndex = normalizedActiveCompareIndex(activeCompareIndex, completeSlots.length);
      const next = serializeFormalComparisonRoute({
        slots: completeSlots,
        atInstant: transitInstant,
        focusSlotId: focusSlotForIndex(routeActiveCompareIndex)
      });
      if (`${window.location.pathname}${window.location.search}` !== next) {
        window.history.replaceState(window.history.state, "", `${next}${window.location.hash}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "正式对照链接无法序列化。");
    }
  }, [activeCompareIndex, appBootReady, completeSlots, routeSyncEnabled, slots.length, transitInstant]);

  useEffect(() => {
    if (slots.length < 2) return;
    setActiveCompareIndex((current) => Math.min(Math.max(current, 1), slots.length - 1));
  }, [slots.length]);

  const acceptUserSession = () => {
    setAcceptedSearch(location.search);
    setRouteSyncEnabled(true);
  };

  const loadCaseIntoSlot = async (index: number, caseId: string) => {
    setSelectorBusy(true);
    setError(null);
    setNotice(null);
    acceptUserSession();
    try {
      if (!caseId) {
        setSlots((current) => current.map((slot, slotIndex) => slotIndex === index
          ? { ...slot, caseId: null, revisionId: null, manualDirection: null }
          : slot));
        return;
      }
      let bundle = bundles.get(caseId);
      if (!bundle) {
        bundle = await caseRepository.getCase(caseId) ?? undefined;
        if (!bundle) throw new Error("所选案例已经不存在。");
        setBundles((current) => new Map(current).set(caseId, bundle!));
      }
      const revisionId = bundle.caseRecord.latestRevisionId;
      const duplicate = slots.some((slot, slotIndex) => slotIndex !== index && slot.revisionId === revisionId);
      setSlots((current) => current.map((slot, slotIndex) => slotIndex === index
        ? { ...slot, caseId, revisionId: duplicate ? null : revisionId, manualDirection: null }
        : slot));
      if (duplicate) setError("该案例的最新修订已在对照台中；请选择另一个历史修订。 ");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取所选案例。");
    } finally {
      setSelectorBusy(false);
    }
  };

  const chooseRevision = (index: number, revisionId: string) => {
    if (revisionId && slots.some((slot, slotIndex) => slotIndex !== index && slot.revisionId === revisionId)) {
      setError("同一正式修订不能重复加入对照。");
      return;
    }
    setError(null);
    setNotice(null);
    acceptUserSession();
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index
      ? { ...slot, revisionId: revisionId || null, manualDirection: null }
      : slot));
  };

  const moveSlot = (from: number, to: number) => {
    acceptUserSession();
    setSlots((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setNotice(to === 0 ? "已将所选修订设为 A 基准盘，全部差异已重新计算。" : null);
  };

  const removeSlot = (index: number) => {
    acceptUserSession();
    setSlots((current) => current.length === 1 ? [blankSlot()] : current.filter((_, slotIndex) => slotIndex !== index));
    setNotice("已移除一个对照位。");
  };

  const addSlot = () => {
    acceptUserSession();
    setSlots((current) => current.length < 4 ? [...current, blankSlot()] : current);
  };

  const setManualDirection = (index: number, value: string) => {
    setError(null);
    acceptUserSession();
    setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      manualDirection: value ? value as "forward" | "backward" : null
    } : item));
  };

  const saveOppositeRuleRevision = async () => {
    const slot = completeSlots[0];
    if (!slot?.caseId || !slot.revisionId) return;
    const revision = selectedRevision(slot, bundles);
    if (!revision) {
      setError("找不到用于派生规则的确切修订。");
      return;
    }
    setSavingRuleVariant(true);
    setError(null);
    setNotice(null);
    acceptUserSession();
    try {
      const originalHash = revision.manifest.resultHash;
      const boundary = alternateBoundary(revision);
      const ruleProfile = withDayBoundaryFromProfile(revision.ruleProfile, boundary);
      const calculated = await calculateChart(revision.input, ruleProfile);
      const updated = await caseRepository.addRevision(slot.caseId, calculated);
      if (revision.manifest.resultHash !== originalHash) throw new Error("原修订被意外改写，已停止对照流程。");
      const created = updated.revisions.at(-1);
      if (!created) throw new Error("新规则修订写入后无法读取。");
      setBundles((current) => new Map(current).set(updated.caseRecord.id, updated));
      setSlots((current) => {
        const nextSlot = { ...blankSlot(), caseId: updated.caseRecord.id, revisionId: created.id };
        const emptyIndex = current.findIndex((item) => !item.caseId || !item.revisionId);
        if (emptyIndex >= 0) return current.map((item, index) => index === emptyIndex ? nextSlot : item);
        return current.length < 4 ? [...current, nextSlot] : current;
      });
      setActiveCompareIndex(1);
      setNotice(`已追加 Revision ${created.revisionNumber}：只改变换日与强耦合的子时日干基准，原修订保持不变。`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法保存换日规则对照修订。");
    } finally {
      setSavingRuleVariant(false);
    }
  };

  const commitTransit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(transitInput)) {
      setError("请输入完整的 UTC 年月日时分。");
      return;
    }
    const instant = `${transitInput}:00.000Z`;
    if (!Number.isFinite(Date.parse(instant)) || new Date(instant).toISOString() !== instant) {
      setError("同步运限 UTC 瞬时点无效。");
      return;
    }
    setError(null);
    acceptUserSession();
    setTransitInstant(instant);
  };

  const allSlotsComplete = completeSlots.length === slots.length;
  const canCompare = allSlotsComplete && slots.length >= 2;

  return (
    <div className="page page--compare">
      <PageHeading
        eyebrow="Comparison desk"
        title="正式命盘对照台"
        description="选择 2～4 个确切 Revision，以 A 为基准对齐输入、校时、完整四柱、规则、来源版本和同一 UTC 瞬时点的六层运限。候选探针保持独立研究入口，不伪装成正式出生盘。"
      />
      <ComparisonModeNav active="formal" />

      <section className="comparison-session" aria-labelledby="comparison-session-title">
        <header className="section-heading-row">
          <div><p className="eyebrow">Stable revision session</p><h2 id="comparison-session-title">选择并排列正式修订</h2></div>
          <StatusPill tone="info">2—4 盘</StatusPill>
        </header>
        <p className="comparison-session-intro">URL 只保存案例与修订 ID，不写入出生资料或别名；刷新后仍读取同一修订，来源被删除或篡改时会明确拒绝。</p>

        {libraryLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在读取案例索引</div> : null}
        {!libraryLoading && cases.length === 0 ? (
          <div className="empty-list"><Columns3 aria-hidden="true" /><h2>先保存两个正式命盘</h2><p>未知时辰候选组不会混入正式 Revision 对照。</p><AppLink href="/new?demo=1" className="primary-action">建立演示案例</AppLink></div>
        ) : null}

        {cases.length > 0 ? (
          <div className="comparison-slot-list" role="group" aria-label="正式命盘对照位">
            {slots.map((slot, index) => {
              const bundle = slot.caseId ? bundles.get(slot.caseId) : undefined;
              const revision = selectedRevision(slot, bundles);
              return (
                <article className="comparison-slot-card" key={slot.selectionId}>
                  <header>
                    <span className="comparison-slot-mark">{slotLabel(index)}</span>
                    <div><strong>{index === 0 ? "基准盘" : `比较盘 ${slotLabel(index)}`}</strong><small>{revision ? `Revision ${revision.revisionNumber}` : "尚未完成选择"}</small></div>
                    <button type="button" className="icon-button" aria-label={`移除对照位 ${slotLabel(index)}`} onClick={() => removeSlot(index)}><X aria-hidden="true" /></button>
                  </header>
                  <label className="field"><span>案例</span><select aria-label={`对照位 ${slotLabel(index)} 案例`} value={slot.caseId ?? ""} disabled={selectorBusy} onChange={(event) => void loadCaseIntoSlot(index, event.target.value)}><option value="">选择正式案例</option>{cases.map((caseRecord) => <option value={caseRecord.id} key={caseRecord.id}>{caseRecord.alias} · {caseRecord.revisionCount} 修订</option>)}</select></label>
                  <label className="field"><span>确切修订</span><select aria-label={`对照位 ${slotLabel(index)} 修订`} value={slot.revisionId ?? ""} disabled={!bundle || selectorBusy} onChange={(event) => chooseRevision(index, event.target.value)}><option value="">选择 Revision</option>{[...(bundle?.revisions ?? [])].reverse().map((item) => <option value={item.id} key={item.id} disabled={slots.some((other, otherIndex) => otherIndex !== index && other.revisionId === item.id)}>Revision {item.revisionNumber} · {item.ruleProfile.label}</option>)}</select></label>
                  {revision?.input.sex === "unspecified" ? <label className="field"><span>大运/小运顺逆</span><select aria-label={`对照位 ${slotLabel(index)} 人工顺逆`} value={slot.manualDirection ?? ""} onChange={(event) => setManualDirection(index, event.target.value)}><option value="">未选择 · 仅降级大运/小运</option><option value="forward">顺行</option><option value="backward">逆行</option></select></label> : null}
                  {revision ? <dl><div><dt>规则配置</dt><dd>{revision.ruleProfile.profileId}@{revision.ruleProfile.profileVersion} · {revision.ruleProfile.calendar.dayBoundary} · {shortHash(revision.manifest.ruleProfileDigest)}</dd></div><div><dt>规则包来源</dt><dd>{revision.rulePackBinding ? `${revision.rulePackBinding.packId} · ${revision.rulePackBinding.useMode} · ${shortHash(revision.rulePackBinding.packDigest)}` : "内置 / 未绑定规则快照"}</dd></div><div><dt>结果</dt><dd>{shortHash(revision.manifest.resultHash)}</dd></div></dl> : null}
                  {revision && slot.caseId ? (
                    <AppLink
                      className="text-link comparison-revision-link"
                      href={revisionResearchHref(slot.caseId, revision.id)}
                      aria-label={`研读对照位 ${slotLabel(index)}：${bundle?.caseRecord.alias ?? revision.caseId} · Revision ${revision.revisionNumber}`}
                    >
                      研读此修订
                    </AppLink>
                  ) : null}
                  <div className="comparison-slot-actions">
                    <button type="button" className="text-button" disabled={index === 0} onClick={() => moveSlot(index, 0)}>设为 A 基准</button>
                    <button type="button" className="icon-button" aria-label={`${slotLabel(index)} 左移`} disabled={index === 0} onClick={() => moveSlot(index, index - 1)}><ArrowLeft aria-hidden="true" /></button>
                    <button type="button" className="icon-button" aria-label={`${slotLabel(index)} 右移`} disabled={index === slots.length - 1} onClick={() => moveSlot(index, index + 1)}><ArrowRight aria-hidden="true" /></button>
                  </div>
                </article>
              );
            })}
            {slots.length < 4 ? <button type="button" className="comparison-add-slot" onClick={addSlot}><Plus aria-hidden="true" /><span>添加比较盘</span><small>最多四个确切 Revision</small></button> : null}
          </div>
        ) : null}

        {completeSlots.length === 1 ? (
          <div className="comparison-rule-variant">
            <GitCompareArrows aria-hidden="true" />
            <div><strong>需要同盘不同规则？</strong><p>从当前确切修订克隆完整规则，只改变换日与其强耦合的子时日干基准；先追加为新 Revision，再进入正式对照。</p></div>
            <button type="button" className="secondary-action" disabled={savingRuleVariant} onClick={() => void saveOppositeRuleRevision()}>{savingRuleVariant ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{savingRuleVariant ? "正在生成并保存" : "生成并保存相反换日修订"}</button>
          </div>
        ) : null}
      </section>

      {error ? <div className="error-panel" role="alert"><strong>对照台未接受本次状态</strong><p>{error}</p></div> : null}
      {notice ? <div className="settings-message" role="status">{notice}</div> : null}
      {!allSlotsComplete && slots.length > 1 ? <div className="info-panel"><Columns3 aria-hidden="true" /><p>请先为每个对照位选择确切 Revision；不会用“最新修订”自动填补缺失来源。</p></div> : null}
      {projectionLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在验签修订并同步计算运限</div> : null}

      {projection && comparisonDisplay && canCompare && acceptedRoute ? (
        <div className="formal-comparison-workspace">
          <section className="comparison-summary" aria-labelledby="comparison-summary-title">
            <div>
              <p className="eyebrow">Difference index</p>
              <h2 id="comparison-summary-title">{differenceScope.kind === "active_pair"
                ? `A ↔ ${slotLabel(displayActiveCompareIndex)}：${comparisonDisplay.differenceCount} 个字段不同`
                : `${comparisonDisplay.differenceCount} 个字段发生变化`}</h2>
              <p>{comparisonDisplay.sameBirthInput
                ? differenceScope.kind === "active_pair"
                  ? `当前 A 与 ${slotLabel(displayActiveCompareIndex)} 的出生输入一致；规则或计算事实差异仍需分别审阅。`
                  : "全部盘的出生输入一致；规则或计算事实差异仍需分别审阅，不能自动推断因果。"
                : differenceScope.kind === "active_pair"
                  ? `当前 A 与 ${slotLabel(displayActiveCompareIndex)} 的出生输入不同；输入差异与规则差异必须分开阅读。`
                  : "本会话包含不同出生输入；输入差异与规则差异必须分开阅读。"}</p>
            </div>
            <StatusPill tone={comparisonDisplay.differenceCount ? "cinnabar" : "neutral"}>{projection.matrix.items.length} 盘 · A 基准</StatusPill>
            <nav className="comparison-difference-index" aria-label="跳到差异分组">
              {comparisonDisplay.sections
                .filter((section) => !differencesOnly || section.differenceCount > 0)
                .map((section) => {
                const targetId = `compare-section-${section.category}`;
                return (
                  <a
                    href={`#${targetId}`}
                    key={section.category}
                    onClick={(event) => {
                      event.preventDefault();
                      const target = document.getElementById(targetId);
                      if (!target) return;
                      if (window.location.hash !== `#${targetId}`) {
                        window.history.pushState(window.history.state, "", `#${targetId}`);
                      }
                      target.scrollIntoView?.({ block: "start" });
                    }}
                  >
                    <span>{CATEGORY_SHORT_LABELS[section.category]}</span>
                    <strong>{section.differenceCount}</strong>
                  </a>
                );
              })}
            </nav>
            <label className="comparison-difference-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />{differenceScope.kind === "active_pair"
              ? `只看当前 A–${slotLabel(displayActiveCompareIndex)} 变化的字段`
              : "只看任一比较盘相对 A 变化的字段"}</label>
          </section>

          {projection.matrix.items.length > 1 ? (
            <div className="comparison-mobile-switcher" role="group" aria-label="选择当前比较盘">
              <span className="comparison-mobile-identity" aria-live="polite">
                <strong>A · {projection.matrix.items[0].caseAlias} · R{projection.matrix.items[0].revision.revisionNumber} ↔ 当前 {slotLabel(displayActiveCompareIndex)} · {projection.matrix.items[displayActiveCompareIndex].caseAlias} · R{projection.matrix.items[displayActiveCompareIndex].revision.revisionNumber}</strong>
                <small>A {projection.matrix.items[0].revision.ruleProfile.profileId}@{projection.matrix.items[0].revision.ruleProfile.profileVersion} · {slotLabel(displayActiveCompareIndex)} {projection.matrix.items[displayActiveCompareIndex].revision.ruleProfile.profileId}@{projection.matrix.items[displayActiveCompareIndex].revision.ruleProfile.profileVersion}</small>
                <span className="comparison-mobile-research-links">
                  {[0, displayActiveCompareIndex].map((index) => {
                    const item = projection.matrix.items[index];
                    const label = slotLabel(index);
                    return (
                      <AppLink
                        key={item.key}
                        className="text-link comparison-revision-link"
                        href={revisionResearchHref(item.caseId, item.revision.id)}
                        aria-label={`从当前身份区研读 ${label}：${item.caseAlias} · Revision ${item.revision.revisionNumber}`}
                      >
                        研读 {label}
                      </AppLink>
                    );
                  })}
                </span>
              </span>
              {projection.matrix.items.length > 2 ? projection.matrix.items.slice(1).map((item, offset) => {
                const index = offset + 1;
                return <button type="button" key={item.key} className={displayActiveCompareIndex === index ? "is-active" : ""} aria-pressed={displayActiveCompareIndex === index} onClick={() => setActiveCompareIndex(index)}>{slotLabel(index)} · {item.caseAlias}</button>;
              }) : null}
            </div>
          ) : null}

          <ComparisonMatrixTable projection={projection} activeCompareIndex={displayActiveCompareIndex} differencesOnly={differencesOnly} differenceScope={differenceScope} />

          <section className="comparison-transit-section" aria-labelledby="comparison-transit-title">
            <header className="section-heading-row">
              <div><p className="eyebrow">Synchronized transit</p><h2 id="comparison-transit-title">同一 UTC 瞬时点 · 六层并行</h2></div>
              <StatusPill tone="warning">engineering_preview</StatusPill>
            </header>
            <form className="comparison-transit-form" onSubmit={commitTransit}>
              <label className="field"><span>目标瞬时点（UTC）</span><input type="datetime-local" value={transitInput} onChange={(event) => setTransitInput(event.target.value)} /><small>此输入明确按 UTC 解释，不按浏览器本地时区解释。</small></label>
              <button type="submit" className="secondary-action"><Clock3 aria-hidden="true" />同步运限</button>
              <code>{transitInstant}</code>
            </form>
            <TransitComparisonTable projection={projection} activeCompareIndex={displayActiveCompareIndex} />
          </section>

          <footer className="comparison-evidence-footer">
            <div><span>对照投影摘要</span><code>{projection.manifest.resultHash}</code></div>
            <p>关系事实仍含待顾问复核映射；运限金标为 0。颜色只辅助定位变化，每个状态均有文字标记。</p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
