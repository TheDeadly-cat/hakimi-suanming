import {
  ArrowRightLeft,
  Clock3,
  Columns2,
  LoaderCircle,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  buildPairStructureResearchDisplayMatrix,
  PAIR_STRUCTURE_RESEARCH_POLICY,
  projectPairStructureResearch,
  type PairStructureResearchProjection
} from "@hakimi/comparison-core";
import type {
  CaseRecord,
  PairStructureResearchRequest,
  RevisionRecord
} from "@hakimi/contracts";
import { caseRepository } from "@hakimi/storage";
import { ComparisonModeNav } from "../components/comparison-mode-nav";
import { ComparisonMatrixTable, TransitComparisonTable } from "../components/formal-comparison-tables";
import { PageHeading } from "../components/page-heading";
import { PairStructureReportExport } from "../components/pair-structure-report-export";
import { StatusPill } from "../components/status-pill";
import { useAppBootReady } from "../lib/app-boot-ready";
import { shortHash } from "../lib/format";
import {
  currentCanonicalUtcMinuteInstant,
  pairResearchUtcMinute,
  parsePairResearchRoute,
  serializePairResearchRoute,
  type PairResearchRouteSlot
} from "../lib/pair-research-route";
import { AppLink, useAppLocation } from "../lib/router";

type CaseBundle = {
  caseRecord: CaseRecord;
  revisions: RevisionRecord[];
};

const CATEGORY_SHORT_LABELS = {
  input: "输入",
  calibration: "校时",
  rule: "规则",
  calendar_fact: "历法",
  pillar_fact: "四柱",
  evidence: "证据"
} as const;

function emptySlots(): [PairResearchRouteSlot, PairResearchRouteSlot] {
  return [
    { caseId: null, revisionId: null, manualDirection: null },
    { caseId: null, revisionId: null, manualDirection: null }
  ];
}

function selectedRevision(
  slot: PairResearchRouteSlot,
  bundles: ReadonlyMap<string, CaseBundle>
): RevisionRecord | null {
  if (!slot.caseId || !slot.revisionId) return null;
  return bundles.get(slot.caseId)?.revisions.find((revision) => revision.id === slot.revisionId) ?? null;
}

function pairRequest(
  slots: [PairResearchRouteSlot, PairResearchRouteSlot],
  atInstant: string
): PairStructureResearchRequest {
  if (!slots[0].caseId || !slots[0].revisionId || !slots[1].caseId || !slots[1].revisionId) {
    throw new Error("双案例结构研究必须先选择两个不同 Case 的确切 Revision。");
  }
  return {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    subjects: [
      { slotId: "A", caseId: slots[0].caseId, revisionId: slots[0].revisionId, manualDirection: slots[0].manualDirection },
      { slotId: "B", caseId: slots[1].caseId, revisionId: slots[1].revisionId, manualDirection: slots[1].manualDirection }
    ],
    atInstant
  };
}

function slotComplete(slot: PairResearchRouteSlot): boolean {
  return Boolean(slot.caseId && slot.revisionId);
}

export function PairResearchPage() {
  const appBootReady = useAppBootReady();
  const location = useAppLocation();
  const fallbackAtInstant = useMemo(() => currentCanonicalUtcMinuteInstant(), []);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [bundles, setBundles] = useState<Map<string, CaseBundle>>(new Map());
  const [slots, setSlots] = useState<[PairResearchRouteSlot, PairResearchRouteSlot]>(emptySlots);
  const [atInstant, setAtInstant] = useState(fallbackAtInstant);
  const [transitInput, setTransitInput] = useState(() => pairResearchUtcMinute(fallbackAtInstant));
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [selectorBusy, setSelectorBusy] = useState(false);
  const [projection, setProjection] = useState<PairStructureResearchProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [routeSyncEnabled, setRouteSyncEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLibraryLoading(true);
      setProjection(null);
      setError(null);
      setNotice(null);
      setRouteSyncEnabled(false);
      const caseRowsPromise = caseRepository.listCases();
      try {
        const route = parsePairResearchRoute(location.search, fallbackAtInstant);
        const requestedCaseIds = [...new Set(route.slots.flatMap((slot) => slot.caseId ? [slot.caseId] : []))];
        const bundlesPromise = Promise.all(requestedCaseIds.map(async (caseId) => {
          const bundle = await caseRepository.getCase(caseId);
          if (!bundle) throw new Error(`双案例链接中的案例 ${caseId} 已不存在。`);
          return bundle;
        }));
        const [caseRows, loadedBundles] = await Promise.all([caseRowsPromise, bundlesPromise]);
        const loadedMap = new Map(loadedBundles.map((bundle) => [bundle.caseRecord.id, bundle]));
        for (const [index, slot] of route.slots.entries()) {
          if (!slot.caseId || !slot.revisionId) continue;
          const bundle = loadedMap.get(slot.caseId);
          if (!bundle?.revisions.some((revision) => revision.id === slot.revisionId)) {
            throw new Error(`对象 ${index === 0 ? "甲" : "乙"} 的修订 ${slot.revisionId} 已不存在，未静默替换为最新修订。`);
          }
        }
        if (active) {
          setCases(caseRows);
          setBundles(loadedMap);
          setSlots(route.slots);
          setAtInstant(route.atInstant);
          setTransitInput(pairResearchUtcMinute(route.atInstant));
          setRouteSyncEnabled(true);
        }
      } catch (reason) {
        const caseRows = await caseRowsPromise;
        if (active) {
          setCases(caseRows);
          setBundles(new Map());
          setSlots(emptySlots());
          setAtInstant(fallbackAtInstant);
          setTransitInput(pairResearchUtcMinute(fallbackAtInstant));
          setError(reason instanceof Error ? reason.message : "无法读取双案例结构研究链接。");
        }
      } finally {
        if (active) setLibraryLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [fallbackAtInstant, location.search]);

  const complete = slotComplete(slots[0]) && slotComplete(slots[1]);
  const routeStateSerializable = slots.every((slot) => !slot.caseId || Boolean(slot.revisionId)) &&
    (!slots[1].caseId || Boolean(slots[0].caseId));

  useEffect(() => {
    if (!routeSyncEnabled || !routeStateSerializable) return;
    // Do not rewrite a cold-entry URL while the production boot verifier is
    // still proving that exact route. User interaction after boot will rerun
    // this effect and keep the shareable route canonical.
    if (!appBootReady) return;
    try {
      const next = serializePairResearchRoute({ slots, atInstant });
      if (`${window.location.pathname}${window.location.search}` !== next) {
        window.history.replaceState({}, "", next);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "双案例链接无法序列化。");
    }
  }, [appBootReady, atInstant, routeStateSerializable, routeSyncEnabled, slots]);

  useEffect(() => {
    if (!complete) {
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
        const request = pairRequest(slots, atInstant);
        const sources = await caseRepository.readPairStructureResearchSources(request);
        const next = await projectPairStructureResearch(request, sources);
        if (active) setProjection(next);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "双案例事实投影失败。");
      } finally {
        if (active) setProjectionLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [atInstant, complete, slots]);

  const displayProjection = useMemo(() => projection ? {
    matrix: buildPairStructureResearchDisplayMatrix(projection),
    transits: projection.participants.map((participant) => participant.transit)
  } : null, [projection]);

  const loadCaseIntoSlot = async (index: 0 | 1, caseId: string) => {
    setSelectorBusy(true);
    setError(null);
    setNotice(null);
    setRouteSyncEnabled(true);
    try {
      if (!caseId) {
        setSlots((current) => index === 0
          ? emptySlots()
          : [current[0], { caseId: null, revisionId: null, manualDirection: null }]);
        return;
      }
      if (index === 1 && !slots[0].caseId) throw new Error("请先选择对象甲及其确切 Revision。");
      if (slots[index === 0 ? 1 : 0].caseId === caseId) {
        throw new Error("对象甲与对象乙必须来自两个不同 Case；同一案例多修订请使用正式对照台。");
      }
      let bundle = bundles.get(caseId);
      if (!bundle) {
        bundle = await caseRepository.getCase(caseId) ?? undefined;
        if (!bundle) throw new Error("所选案例已经不存在。");
        setBundles((current) => new Map(current).set(caseId, bundle!));
      }
      setSlots((current) => {
        const next = [...current] as [PairResearchRouteSlot, PairResearchRouteSlot];
        next[index] = { caseId, revisionId: null, manualDirection: null };
        return next;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取所选案例。");
    } finally {
      setSelectorBusy(false);
    }
  };

  const chooseRevision = (index: 0 | 1, revisionId: string) => {
    setError(null);
    setNotice(null);
    setRouteSyncEnabled(true);
    setSlots((current) => {
      const next = [...current] as [PairResearchRouteSlot, PairResearchRouteSlot];
      next[index] = { ...next[index], revisionId: revisionId || null, manualDirection: null };
      return next;
    });
  };

  const setManualDirection = (index: 0 | 1, value: string) => {
    setError(null);
    setRouteSyncEnabled(true);
    setSlots((current) => {
      const next = [...current] as [PairResearchRouteSlot, PairResearchRouteSlot];
      next[index] = {
        ...next[index],
        manualDirection: value ? value as "forward" | "backward" : null
      };
      return next;
    });
  };

  const swapSubjects = () => {
    if (!complete) return;
    setSlots((current) => [
      { ...current[1] },
      { ...current[0] }
    ]);
    setNotice("已交换对象甲与对象乙；只改变显示顺序和机械差异锚点，不改写任何一方事实。");
    setRouteSyncEnabled(true);
  };

  const commitTransit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(transitInput)) {
      setError("请输入完整的 UTC 年月日时分。");
      return;
    }
    const next = `${transitInput}:00.000Z`;
    if (!Number.isFinite(Date.parse(next)) || new Date(next).toISOString() !== next) {
      setError("双案例同步运限 UTC 瞬时点无效。");
      return;
    }
    setError(null);
    setAtInstant(next);
    setRouteSyncEnabled(true);
  };

  return (
    <div className="page page--compare page--pair-research">
      <PageHeading
        eyebrow="Pair fact research"
        title="双案例结构研究 · 事实层"
        description="选择两个不同 Case 的确切 Revision，在同一 UTC 瞬时点并列各自输入、规则、四柱、盘内关系事实与六层运限。"
      />
      <ComparisonModeNav active="pair" />

      <aside className="pair-boundary-note" aria-labelledby="pair-boundary-title">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong id="pair-boundary-title">事实层硬边界</strong>
          <p>本页不生成跨盘干支推导、吉凶、因果、缘分、婚配结论或任何评分。对象甲只是字段差异的技术锚点，不代表主次、优劣或关系判断。</p>
        </div>
        <StatusPill tone="info">participant_facts_only</StatusPill>
      </aside>

      <section className="comparison-session pair-selection-session" aria-labelledby="pair-selection-title">
        <header className="section-heading-row">
          <div><p className="eyebrow">Exact revision pair</p><h2 id="pair-selection-title">选择两个不同案例</h2></div>
          <button type="button" className="secondary-action" disabled={!complete || projectionLoading} onClick={swapSubjects}>
            <ArrowRightLeft aria-hidden="true" />交换甲乙
          </button>
        </header>
        <p className="comparison-session-intro">先选择 Case，再显式选择 Revision；不会把“最新修订”写入空缺。链接只保存 opaque ID、UTC 和必要的人工顺逆，不写出生资料或别名。</p>

        {libraryLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在读取案例索引</div> : null}
        {!libraryLoading && cases.length < 2 ? (
          <div className="empty-list"><Columns2 aria-hidden="true" /><h2>先保存两个不同正式案例</h2><p>同一案例的多个 Revision 属于“多盘 / 多规则”对照，不会进入双案例模式。</p><AppLink href="/new?demo=1" className="primary-action">建立演示案例</AppLink></div>
        ) : null}

        {cases.length >= 2 ? (
          <div className="pair-slot-grid" role="group" aria-label="双案例研究对象">
            {slots.map((slot, rawIndex) => {
              const index = rawIndex as 0 | 1;
              const role = index === 0 ? "甲" : "乙";
              const bundle = slot.caseId ? bundles.get(slot.caseId) : undefined;
              const revision = selectedRevision(slot, bundles);
              const otherCaseId = slots[index === 0 ? 1 : 0].caseId;
              return (
                <fieldset className="pair-slot-card" key={role}>
                  <legend><span className="comparison-slot-mark">{role}</span>研究对象{role}</legend>
                  <label className="field"><span>正式案例</span><select aria-label={`对象${role}案例`} value={slot.caseId ?? ""} disabled={selectorBusy || (index === 1 && !slots[0].caseId)} onChange={(event) => void loadCaseIntoSlot(index, event.target.value)}><option value="">选择正式案例</option>{cases.map((caseRecord) => <option value={caseRecord.id} key={caseRecord.id} disabled={caseRecord.id === otherCaseId}>{caseRecord.alias} · {caseRecord.revisionCount} 修订</option>)}</select><small>{index === 1 && !slots[0].caseId ? "请先完成对象甲的案例选择。" : "另一侧已使用的 Case 会禁用。"}</small></label>
                  <label className="field"><span>确切 Revision</span><select aria-label={`对象${role}修订`} value={slot.revisionId ?? ""} disabled={!bundle || selectorBusy} onChange={(event) => chooseRevision(index, event.target.value)}><option value="">显式选择 Revision</option>{[...(bundle?.revisions ?? [])].reverse().map((item) => <option value={item.id} key={item.id}>Revision {item.revisionNumber} · {item.ruleProfile.label}</option>)}</select><small>不会自动追随该案例未来新增的 Revision。</small></label>
                  {revision?.input.sex === "unspecified" ? <label className="field"><span>大运/小运人工顺逆</span><select aria-label={`对象${role}人工顺逆`} value={slot.manualDirection ?? ""} onChange={(event) => setManualDirection(index, event.target.value)}><option value="">未选择 · 仅降级大运/小运</option><option value="forward">顺行</option><option value="backward">逆行</option></select><small>该选择写入 URL，并只作用于本对象自己的运限。</small></label> : null}
                  {revision ? <dl><div><dt>规则</dt><dd>{revision.ruleProfile.calendar.dayBoundary} · {shortHash(revision.manifest.ruleProfileDigest)}</dd></div><div><dt>修订摘要</dt><dd>{shortHash(revision.manifest.resultHash)}</dd></div></dl> : null}
                </fieldset>
              );
            })}
          </div>
        ) : null}
      </section>

      {error ? <div className="error-panel" role="alert"><strong>双案例研究未接受本次状态</strong><p>{error}</p>{/同一案例|同一个 Case|两个不同 Case/.test(error) ? <AppLink href="/compare" className="text-button">转到多盘 / 多规则对照</AppLink> : null}</div> : null}
      {notice ? <div className="settings-message" role="status">{notice}</div> : null}
      {!complete && cases.length >= 2 ? <div className="info-panel"><Columns2 aria-hidden="true" /><p>请为对象甲与对象乙分别选择不同 Case 的确切 Revision；完成前不会生成或猜测双案例投影。</p></div> : null}
      {projectionLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在分别验签两方修订并计算事实</div> : null}

      {projection && displayProjection ? (
        <div className="formal-comparison-workspace pair-research-workspace">
          <section className="comparison-summary" aria-labelledby="pair-summary-title">
            <div>
              <p className="eyebrow">Mechanical difference index</p>
              <h2 id="pair-summary-title">{displayProjection.matrix.differenceCount} 个字段值不同</h2>
              <p>差异数仅由两方各自冻结事实临时计算，用于定位阅读；不会写入双案例事实工件，也不构成跨盘命理判断。</p>
            </div>
            <StatusPill tone="neutral">2 案例 · 96 项事实</StatusPill>
            <nav className="comparison-difference-index" aria-label="跳到双案例事实分组">
              {displayProjection.matrix.sections.map((section) => <a href={`#compare-section-${section.category}`} key={section.category}><span>{CATEGORY_SHORT_LABELS[section.category]}</span><strong>{section.differenceCount}</strong></a>)}
            </nav>
            <label className="comparison-difference-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />只看字段值不同项</label>
          </section>

          <PairStructureReportExport
            key={projection.manifest.resultHash}
            projection={projection}
          />

          <ComparisonMatrixTable projection={displayProjection} activeCompareIndex={1} differencesOnly={differencesOnly} mode="pair" />

          <section className="comparison-transit-section" aria-labelledby="pair-transit-title">
            <header className="section-heading-row">
              <div><p className="eyebrow">Same instant · separate facts</p><h2 id="pair-transit-title">同一 UTC 瞬时点 · 各自六层运限</h2></div>
              <StatusPill tone="warning">engineering_projection</StatusPill>
            </header>
            <form className="comparison-transit-form" onSubmit={commitTransit}>
              <label className="field"><span>目标瞬时点（UTC）</span><input type="datetime-local" value={transitInput} onChange={(event) => setTransitInput(event.target.value)} /><small>同一瞬时点分别按两方自己的时区、规则与 Revision 计算。</small></label>
              <button type="submit" className="secondary-action"><Clock3 aria-hidden="true" />同步两方运限</button>
              <code>{atInstant}</code>
            </form>
            <TransitComparisonTable projection={displayProjection} activeCompareIndex={1} mode="pair" />
          </section>

          <footer className="comparison-evidence-footer pair-evidence-footer">
            <div><span>双案例事实工件摘要</span><code>{projection.manifest.resultHash}</code></div>
            <p><code>participant_facts_only</code> · <code>scoreIncluded=false</code> · <code>compatibilityIncluded=false</code> · <code>crossChartDerivationIncluded=false</code>。当前仍是工程投影，不是命理金标或关系结论。</p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
