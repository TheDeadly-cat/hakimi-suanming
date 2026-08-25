import {
  ArrowRightLeft,
  Clock3,
  Columns2,
  LoaderCircle,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { shortHash as formatShortHash } from "../lib/format";
import {
  currentCanonicalUtcMinuteInstant,
  pairResearchUtcMinute,
  parsePairResearchRoute,
  serializePairResearchRoute,
  type PairResearchRouteSlot
} from "../lib/pair-research-route";
import { AppLink, useAppLocation } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./pair-research-page.css";

type CaseBundle = {
  caseRecord: CaseRecord;
  revisions: RevisionRecord[];
};

type PairWorkspaceSection = "summary" | "export" | "matrix" | "transit";

const PAIR_WORKSPACE_NAV: ReadonlyArray<{ id: PairWorkspaceSection; label: string }> = [
  { id: "summary", label: "差异总览" },
  { id: "export", label: "审计导出" },
  { id: "matrix", label: "字段矩阵" },
  { id: "transit", label: "同刻运限" }
];

const CATEGORY_SHORT_LABELS = {
  input: "输入",
  calibration: "校时",
  rule: "规则",
  calendar_fact: "历法",
  pillar_fact: "四柱",
  evidence: "证据"
} as const;

function shortHash(value: unknown): string {
  return formatShortHash(safeVisibleText(value, "摘要不可用", 180));
}

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

function pairCaseIndexIntegrityIssue(records: readonly CaseRecord[]): string | null {
  if (
    records.some(
      (record) =>
        typeof record.id !== "string" ||
        record.id.trim().length === 0 ||
        !Number.isSafeInteger(record.revisionCount) ||
        record.revisionCount < 0 ||
        (record.revisionCount > 0 && !record.latestRevisionId)
    )
  ) {
    return "正式案例索引包含无效 Case ID、修订计数或最新修订指针，已拒绝建立甲乙选择器。";
  }

  if (new Set(records.map((record) => record.id)).size !== records.length) {
    return "正式案例索引包含重复 Case ID，已拒绝建立甲乙选择器。";
  }
  if (records.some((record) => record.deletedAt !== null)) {
    return "正式案例索引混入了回收站记录，已拒绝用于双案例研究。";
  }
  return null;
}

function pairBundleIntegrityIssue(bundle: CaseBundle, expectedCaseId: string): string | null {
  if (bundle.caseRecord.id !== expectedCaseId) return "案例仓库返回了不匹配的 Case 来源。";
  if (bundle.caseRecord.deletedAt !== null) return "所选案例已在回收站，不能建立新的双案例投影。";
  if (!bundle.revisions.length) return "正式案例没有任何 Revision，不能加入双案例研究。";
  if (bundle.caseRecord.revisionCount !== bundle.revisions.length) {
    return `案例声明 ${bundle.caseRecord.revisionCount} 个 Revision，但实际读取到 ${bundle.revisions.length} 个。`;
  }
  if (new Set(bundle.revisions.map((revision) => revision.id)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision ID，无法建立唯一甲乙来源。";
  }
  if (new Set(bundle.revisions.map((revision) => revision.revisionNumber)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision 序号，无法建立唯一历史顺序。";
  }
  if (bundle.revisions.some((revision) => revision.caseId !== expectedCaseId)) {
    return "案例包混入了属于其他 Case 的 Revision。";
  }
  const latestRevision = bundle.revisions.find((revision) => revision.id === bundle.caseRecord.latestRevisionId);
  if (!latestRevision) return "案例声明的 latestRevisionId 不在当前 Revision 集合中。";
  if (bundle.revisions.some((revision) => revision.revisionNumber > latestRevision.revisionNumber)) {
    return "案例声明的 latestRevisionId 未指向最高 Revision 序号。";
  }
  return null;
}

function pairProjectionIntegrityIssue(
  projection: PairStructureResearchProjection,
  slots: [PairResearchRouteSlot, PairResearchRouteSlot],
  expectedAtInstant: string
): string | null {
  if (!/^[a-f0-9]{64}$/i.test(projection.manifest.resultHash)) {
    return "双案例投影没有可核对的 64 位 SHA-256 结果摘要。";
  }
  if (projection.targetInstant !== expectedAtInstant) {
    return "双案例投影返回的目标 UTC 与当前提交瞬时点不一致。";
  }
  if (projection.participants.length !== 2) {
    return `双案例投影必须恰好返回两个参与对象，实际收到 ${projection.participants.length} 个。`;
  }
  const returnedRevisionIds: string[] = [];
  const returnedItemKeys: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    const expectedRole = index === 0 ? "A" : "B";
    const roleLabel = index === 0 ? "甲" : "乙";
    const expectedCaseId = slots[index].caseId;
    const expectedRevisionId = slots[index].revisionId;
    const participant = projection.participants[index];
    if (!expectedRevisionId || !participant || participant.item.revision.id !== expectedRevisionId) {
      return `对象${roleLabel}的投影返回值没有绑定当前确切 Revision。`;
    }
    if (participant.role !== expectedRole || participant.item.slotId !== expectedRole) {
      return `对象${roleLabel}的投影 Role 或 Slot 与当前位置不一致。`;
    }
    if (
      !expectedCaseId
      || participant.item.caseId !== expectedCaseId
      || participant.item.revision.caseId !== expectedCaseId
    ) {
      return `对象${roleLabel}的投影 Case 与当前选择或 Revision 归属不一致。`;
    }
    if (!participant.item.key.trim() || !participant.item.caseAlias.trim()) {
      return `对象${roleLabel}的投影缺少稳定列键或案例标签。`;
    }
    if (!/^[a-f0-9]{64}$/i.test(participant.item.revisionSnapshotDigest)) {
      return `对象${roleLabel}的 Revision 记录摘要格式无效。`;
    }
    if (!Array.isArray(participant.observations)) {
      return `对象${roleLabel}的源投影事实不是可核对列表。`;
    }
    returnedItemKeys.push(participant.item.key);
    returnedRevisionIds.push(participant.item.revision.id);
  }
  if (new Set(returnedItemKeys).size !== returnedItemKeys.length) {
    return "双案例投影为对象甲与对象乙返回了重复列键。";
  }
  if (new Set(returnedRevisionIds).size !== returnedRevisionIds.length) {
    return "双案例投影为对象甲与对象乙返回了同一 Revision。";
  }
  return null;
}

function pairRequest(
  slots: [PairResearchRouteSlot, PairResearchRouteSlot],
  atInstant: string
): PairStructureResearchRequest {
  if (!slots[0].caseId || !slots[0].revisionId || !slots[1].caseId || !slots[1].revisionId) {
    throw new Error("双案例结构研究必须先选择两个不同 Case 的确切 Revision。");
  }
  if (slots[0].caseId === slots[1].caseId) {
    throw new Error("双案例结构研究拒绝同一 Case；同一案例多修订请使用正式对照台。");
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

function revisionResearchHref(caseId: string, revisionId: string): string {
  return `/cases/${encodeURIComponent(caseId)}/revisions/${encodeURIComponent(revisionId)}?view=research`;
}

export function PairResearchPage() {
  const appBootReady = useAppBootReady();
  const location = useAppLocation();
  const fallbackAtInstant = useMemo(() => currentCanonicalUtcMinuteInstant(), []);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [bundles, setBundles] = useState<Map<string, CaseBundle>>(() => new Map());
  const [slots, setSlots] = useState<[PairResearchRouteSlot, PairResearchRouteSlot]>(emptySlots);
  const [atInstant, setAtInstant] = useState(fallbackAtInstant);
  const [transitInput, setTransitInput] = useState(() => pairResearchUtcMinute(fallbackAtInstant));
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryReloadToken, setLibraryReloadToken] = useState(0);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [selectorBusy, setSelectorBusy] = useState(false);
  const [projection, setProjection] = useState<PairStructureResearchProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeSyncError, setRouteSyncError] = useState<string | null>(null);
  const [projectionError, setProjectionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<PairWorkspaceSection>("summary");
  const [routeSyncEnabled, setRouteSyncEnabled] = useState(false);
  const [boundRouteHref, setBoundRouteHref] = useState<string | null>(null);
  const selectorBusyRef = useRef(false);
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    let active = true;
    const sessionEpoch = sessionEpochRef.current + 1;
    sessionEpochRef.current = sessionEpoch;
    selectorBusyRef.current = false;
    const load = async () => {
      setLibraryLoading(true);
      setSelectorBusy(false);
      setLibraryError(null);
      setCases([]);
      setBundles(new Map());
      setSlots(emptySlots());
      setProjection(null);
      setError(null);
      setRouteSyncError(null);
      setProjectionError(null);
      setNotice(null);
      setRouteSyncEnabled(false);
      setBoundRouteHref(null);
      const caseRowsPromise = caseRepository.listCases();
      try {
        const route = parsePairResearchRoute(location.search, fallbackAtInstant);
        if (route.slots[0].caseId && route.slots[0].caseId === route.slots[1].caseId) {
          throw new Error("双案例链接中的对象甲与对象乙指向同一 Case，已拒绝载入；同一案例多修订请使用正式对照台。");
        }
        const requestedCaseIds = [...new Set(route.slots.flatMap((slot) => slot.caseId ? [slot.caseId] : []))];
        const bundlesPromise = Promise.all(requestedCaseIds.map(async (caseId) => {
          const bundle = await caseRepository.getCase(caseId);
          if (!bundle) throw new Error(`双案例链接中的案例 ${caseId} 已不存在。`);
          const integrityIssue = pairBundleIntegrityIssue(bundle, caseId);
          if (integrityIssue) throw new Error(`双案例链接中的案例 ${caseId} 完整性未通过：${integrityIssue}`);
          return bundle;
        }));
        const [caseRows, loadedBundles] = await Promise.all([caseRowsPromise, bundlesPromise]);
        const caseIndexIssue = pairCaseIndexIntegrityIssue(caseRows);
        if (caseIndexIssue) {
          if (active) setLibraryError(caseIndexIssue);
          return;
        }
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
        let caseRows: CaseRecord[] = [];
        let caseRowsFailure: unknown = null;
        try {
          caseRows = await caseRowsPromise;
          const caseIndexIssue = pairCaseIndexIntegrityIssue(caseRows);
          if (caseIndexIssue) {
            caseRows = [];
            caseRowsFailure = new Error(caseIndexIssue);
          }
        } catch (caseReason) {
          caseRowsFailure = caseReason;
        }
        if (active) {
          setCases(caseRows);
          setBundles(new Map());
          setSlots(emptySlots());
          setAtInstant(fallbackAtInstant);
          setTransitInput(pairResearchUtcMinute(fallbackAtInstant));
          if (caseRowsFailure) {
            setLibraryError(safeVisibleErrorMessage(caseRowsFailure, "无法读取正式案例索引。"));
            setError(null);
          } else {
            setError(safeVisibleErrorMessage(reason, "无法读取双案例结构研究链接。"));
          }
        }
      } finally {
        if (active) setLibraryLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      if (sessionEpochRef.current === sessionEpoch) {
        sessionEpochRef.current += 1;
        selectorBusyRef.current = false;
      }
    };
  }, [fallbackAtInstant, libraryReloadToken, location.search]);

  const complete = slotComplete(slots[0]) && slotComplete(slots[1]);
  const revisionsNewestFirstByCase = useMemo(() => new Map(
    [...bundles.entries()].map(([caseId, bundle]) => [
      caseId,
      [...bundle.revisions].sort((left, right) =>
        right.revisionNumber - left.revisionNumber || left.id.localeCompare(right.id)
      )
    ])
  ), [bundles]);
  const routeStateSerializable = slots.every((slot) => !slot.caseId || Boolean(slot.revisionId)) &&
    (!slots[1].caseId || Boolean(slots[0].caseId)) &&
    (!slots[0].caseId || !slots[1].caseId || slots[0].caseId !== slots[1].caseId);
  const canonicalRoute = useMemo(() => {
    if (!routeStateSerializable) return { href: null, issue: null };
    try {
      return { href: serializePairResearchRoute({ slots, atInstant }), issue: null };
    } catch (reason) {
      return { href: null, issue: safeVisibleErrorMessage(reason, "双案例链接无法序列化。") };
    }
  }, [atInstant, routeStateSerializable, slots]);

  useEffect(() => {
    if (!routeSyncEnabled || !routeStateSerializable) {
      setBoundRouteHref(null);
      return;
    }
    // Do not rewrite a cold-entry URL while the production boot verifier is
    // still proving that exact route. User interaction after boot will rerun
    // this effect and keep the shareable route canonical.
    if (!appBootReady) {
      setBoundRouteHref(null);
      return;
    }
    if (canonicalRoute.issue || !canonicalRoute.href) {
      setBoundRouteHref(null);
      setRouteSyncError(canonicalRoute.issue ?? "双案例链接无法序列化。");
      return;
    }
    const expectedRoute = canonicalRoute.href;
    try {
      if (`${window.location.pathname}${window.location.search}` !== expectedRoute) {
        window.history.replaceState(window.history.state, "", expectedRoute);
      }
      if (`${window.location.pathname}${window.location.search}` !== expectedRoute) {
        throw new Error("浏览器未接受当前双案例规范链接。");
      }
      setBoundRouteHref(expectedRoute);
      setRouteSyncError(null);
    } catch (reason) {
      setBoundRouteHref(null);
      setRouteSyncError(safeVisibleErrorMessage(reason, "双案例链接无法序列化。"));
    }
  }, [appBootReady, canonicalRoute, routeStateSerializable, routeSyncEnabled]);

  const routeBound = canonicalRoute.href !== null
    && boundRouteHref === canonicalRoute.href
    && routeSyncError === null;
  const routeBindingState = routeSyncError
    ? "failed"
    : routeBound
      ? "bound"
      : routeSyncEnabled
        ? "pending"
        : "disabled";

  useEffect(() => {
    if (!complete) {
      setProjection(null);
      setProjectionLoading(false);
      setProjectionError(null);
      return;
    }
    let active = true;
    const run = async () => {
      setProjectionLoading(true);
      setProjection(null);
      setProjectionError(null);
      try {
        const request = pairRequest(slots, atInstant);
        const sources = await caseRepository.readPairStructureResearchSources(request);
        const next = await projectPairStructureResearch(request, sources);
        const integrityIssue = pairProjectionIntegrityIssue(next, slots, atInstant);
        if (integrityIssue) throw new Error(integrityIssue);
        if (active) setProjection(next);
      } catch (reason) {
        if (active) setProjectionError(safeVisibleErrorMessage(reason, "双案例事实投影失败。"));
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
  const selectionSummary = useMemo(() => slots.map((slot, index) => {
      const bundle = slot.caseId ? bundles.get(slot.caseId) : undefined;
      const revision = selectedRevision(slot, bundles);
      return {
        role: index === 0 ? "甲" : "乙",
        alias: bundle?.caseRecord.alias ?? null,
        caseId: slot.caseId,
        revisionId: revision?.id ?? null,
        revisionNumber: revision?.revisionNumber ?? null,
        resultHash: revision?.manifest.resultHash ?? null,
        ruleProfile: revision ? `${revision.ruleProfile.profileId}@${revision.ruleProfile.profileVersion}` : null,
        ruleDigest: revision?.manifest.ruleProfileDigest ?? null,
        manualDirection: slot.manualDirection
      };
    }), [bundles, slots]);

  useEffect(() => {
    if (!projection || typeof IntersectionObserver === "undefined") return;
    setActiveWorkspaceSection("summary");
    const sections = PAIR_WORKSPACE_NAV
      .map((item) => document.getElementById(`pair-research-${item.id}`))
      .filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const nearestVisible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top - 150) - Math.abs(right.boundingClientRect.top - 150))[0];
      const section = (nearestVisible?.target as HTMLElement | undefined)?.dataset.pairSection;
      if (section === "summary" || section === "export" || section === "matrix" || section === "transit") {
        setActiveWorkspaceSection(section);
      }
    }, { rootMargin: "-140px 0px -58% 0px", threshold: [0, 0.08, 0.35] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [projection]);

  const invalidateProjection = () => {
    setProjection(null);
    setProjectionError(null);
    setDifferencesOnly(false);
  };

  const loadCaseIntoSlot = async (index: 0 | 1, caseId: string) => {
    if (selectorBusyRef.current) return;
    const operationEpoch = sessionEpochRef.current;
    selectorBusyRef.current = true;
    setSelectorBusy(true);
    setError(null);
    setNotice(null);
    setRouteSyncEnabled(true);
    try {
      if (!caseId) {
        invalidateProjection();
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
        const loaded = await caseRepository.getCase(caseId);
        if (operationEpoch !== sessionEpochRef.current) return;
        if (!loaded) throw new Error("所选案例已经不存在。");
        bundle = loaded;
      }
      const integrityIssue = pairBundleIntegrityIssue(bundle, caseId);
      if (integrityIssue) throw new Error(`所选案例完整性未通过：${integrityIssue}`);
      if (operationEpoch !== sessionEpochRef.current) return;
      invalidateProjection();
      setBundles((current) => new Map(current).set(caseId, bundle!));
      setSlots((current) => {
        const next = [...current] as [PairResearchRouteSlot, PairResearchRouteSlot];
        next[index] = { caseId, revisionId: null, manualDirection: null };
        return next;
      });
    } catch (reason) {
      if (operationEpoch === sessionEpochRef.current) {
        setError(safeVisibleErrorMessage(reason, "无法读取所选案例。"));
      }
    } finally {
      if (operationEpoch === sessionEpochRef.current) {
        selectorBusyRef.current = false;
        setSelectorBusy(false);
      }
    }
  };

  const chooseRevision = (index: 0 | 1, revisionId: string) => {
    if (selectorBusyRef.current) return;
    invalidateProjection();
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
    if (selectorBusyRef.current) return;
    invalidateProjection();
    setError(null);
    setNotice(null);
    setRouteSyncEnabled(true);
    const manualDirection = value === "forward" || value === "backward" ? value : null;
    setSlots((current) => {
      const next = [...current] as [PairResearchRouteSlot, PairResearchRouteSlot];
      next[index] = {
        ...next[index],
        manualDirection
      };
      return next;
    });
  };

  const swapSubjects = () => {
    if (!complete || selectorBusyRef.current) return;
    invalidateProjection();
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
    invalidateProjection();
    setError(null);
    setNotice(null);
    setAtInstant(next);
    setRouteSyncEnabled(true);
  };

  const committedTransitInput = pairResearchUtcMinute(atInstant);
  const transitDirty = transitInput !== committedTransitInput;
  const projectionStatus = selectorBusy
    ? "selecting"
    : projectionLoading
      ? "projecting"
      : projection
        ? "ready"
        : projectionError
          ? "failed"
          : complete
            ? "waiting"
            : "incomplete";
  const projectionStatusTitle = projectionStatus === "selecting"
    ? "正在核对候选 Case，当前稳定工件暂不改写"
    : projectionStatus === "projecting"
      ? "正在复核两方修订摘要并计算事实"
      : projectionStatus === "ready"
        ? "双案例事实工件已绑定"
        : projectionStatus === "failed"
          ? "本次事实投影未生成"
          : projectionStatus === "waiting"
            ? "等待事实投影开始"
            : "等待两个确切 Revision";
  const lockedSourceCount = selectionSummary.filter((subject) => subject.revisionId !== null).length;
  const workflowActiveStep = libraryError || selectorBusy || !complete
    ? 1
    : projection
      ? 3
      : 2;
  const projectionWorkflowState = projection
    ? "complete"
    : projectionError
      ? "blocked"
      : complete
        ? "active"
        : "locked";

  return (
    <div
      className="page page--compare page--pair-research"
      data-projection-state={projectionStatus}
      data-route-binding-state={routeBindingState}
      data-active-research-section={projection ? activeWorkspaceSection : "none"}
      data-db-generation={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-release-identity="legacy-v13"
      data-target-schema={CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.engineeringEvidenceOnly)}
      data-evidence-authority="engineering-only"
      data-projection-authority="participant-facts-only"
      data-mutation-epoch-bypass="false"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      aria-busy={libraryLoading || selectorBusy || projectionLoading}
    >
      <p className="pair-print-boundary">
        浏览器打印仅呈现当前工程复核视图，不是冻结报告、专家审核或公开发布凭据；可移交的冻结输出以本页实际生成并下载的报告文件为准。
      </p>

      <PageHeading
        eyebrow="Pair fact research"
        title="双案例结构研究 · 工程事实层"
        description="选择两个不同 Case 的确切 Revision，在同一 UTC 瞬时点并列各自输入、规则、四柱、已冻结盘内事实与六层运限；不推导跨盘关系。"
      />
      <ComparisonModeNav active="pair" />

      <aside className="pair-boundary-note" aria-labelledby="pair-boundary-title">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong id="pair-boundary-title">事实层硬边界</strong>
          <p>本页不生成跨盘干支推导、吉凶、因果、缘分、婚配结论或任何评分。对象甲只是字段差异的技术锚点，不代表主次、优劣或关系判断。</p>
        </div>
        <StatusPill tone="info">仅参与者事实</StatusPill>
      </aside>

      <section className="pair-workflow-rail" aria-labelledby="pair-workflow-title">
        <header>
          <p className="eyebrow">Research sequence</p>
          <h2 id="pair-workflow-title">四阶段研究路径</h2>
          <p>先固定来源，再生成工件；核对与导出只在精确投影存在时开放。</p>
        </header>
        <ol>
          <li data-state={libraryError ? "blocked" : selectorBusy || !complete ? "active" : "complete"} aria-current={workflowActiveStep === 1 ? "step" : undefined}>
            <span aria-hidden="true">01</span>
            <div><small>Exact sources</small><strong>锁定两个修订</strong><p>{libraryError ? "案例索引不可用" : selectorBusy ? `正在核对候选 Case；稳定绑定 ${lockedSourceCount}/2` : `已锁定 ${lockedSourceCount}/2`}</p></div>
          </li>
          <li data-state={projectionWorkflowState} aria-current={workflowActiveStep === 2 ? "step" : undefined}>
            <span aria-hidden="true">02</span>
            <div><small>Projection</small><strong>生成事实工件</strong><p>{projection ? `摘要 ${shortHash(projection.manifest.resultHash)}` : projectionError ? "生成失败；旧工件已撤下" : complete ? projectionLoading ? "正在复核摘要并分别计算" : "等待投影任务开始" : "等待两个精确来源"}</p></div>
          </li>
          <li data-state={projection ? workflowActiveStep === 3 ? "active" : "available" : "locked"} aria-current={workflowActiveStep === 3 ? "step" : undefined}>
            <span aria-hidden="true">03</span>
            <div><small>Review</small><strong>核对字段差异</strong><p>{displayProjection ? `${displayProjection.matrix.differenceCount} 个机械差异可定位` : "事实工件生成后解锁"}</p></div>
          </li>
          <li data-state={projection ? "available" : "locked"}>
            <span aria-hidden="true">04</span>
            <div><small>Export</small><strong>导出审计报告</strong><p>{projection ? "可导出当前绑定工件" : "事实工件生成后解锁"}</p></div>
          </li>
        </ol>
      </section>

      <section className="comparison-session pair-selection-session" aria-labelledby="pair-selection-title" aria-busy={libraryLoading || selectorBusy} data-state={libraryError ? "unavailable" : libraryLoading ? "loading" : "ready"}>
        <header className="section-heading-row">
          <div><p className="eyebrow">Exact revision pair</p><h2 id="pair-selection-title">选择两个不同案例</h2></div>
          <button type="button" className="secondary-action" disabled={Boolean(libraryError) || !complete || selectorBusy} onClick={swapSubjects}>
            <ArrowRightLeft aria-hidden="true" />交换甲乙
          </button>
        </header>
        <p className="comparison-session-intro">先选择 Case，再显式选择 Revision；不会把“最新修订”写入空缺。链接只保存 opaque ID、UTC 和必要的人工顺逆，不写出生资料或别名。</p>

        <div className="pair-session-axis" aria-label="双案例选择状态" data-state={libraryError ? "unavailable" : "ready"}>
          {selectionSummary.map((subject, index) => (
            <div className={`pair-session-subject pair-session-subject--${index === 0 ? "a" : "b"}`} data-complete={subject.revisionNumber !== null} key={subject.role}>
              <span>{subject.role}</span>
              <div>
                <small>{subject.revisionNumber === null ? "等待确切 Revision" : "确切 Revision 已绑定"}</small>
                <strong>{safeVisibleText(subject.alias, `等待对象${subject.role}`, 160)}</strong>
                <p>{subject.revisionNumber === null ? subject.alias ? "尚未选择确切 Revision" : "尚未选择正式案例" : `Revision ${subject.revisionNumber} · 固定引用`}</p>
              </div>
            </div>
          ))}
          <div className="pair-session-instant">
            <ArrowRightLeft aria-hidden="true" />
            <span>同一 UTC · 分别计算</span>
            <code>{pairResearchUtcMinute(atInstant)}</code>
          </div>
        </div>

        {libraryLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在读取案例索引</div> : null}
        {!libraryLoading && libraryError ? (
          <div className="pair-library-unavailable" role="alert">
            <Columns2 aria-hidden="true" />
            <div><p className="eyebrow">Case index unavailable</p><h2>案例索引不可用</h2><p>页面没有把读取失败解释成“少于两个案例”，也不会显示旧选择或生成双案例投影。</p><button type="button" className="secondary-action" onClick={() => setLibraryReloadToken((current) => current + 1)}>重新读取案例索引</button></div>
          </div>
        ) : null}
        {!libraryLoading && !libraryError && !error && cases.length < 2 ? (
          <div className="empty-list"><Columns2 aria-hidden="true" /><h2>先保存两个不同正式案例</h2><p>同一案例的多个 Revision 属于“多盘 / 多规则”对照，不会进入双案例模式。</p><div className="pair-empty-actions"><AppLink href="/new" className="primary-action">新建正式案例</AppLink><AppLink href="/new?demo=1" className="secondary-action">使用固定演示</AppLink></div></div>
        ) : null}

        {!libraryError && cases.length >= 2 ? (
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
                  <label className="field"><span>正式案例</span><select aria-label={`对象${role}案例`} aria-describedby={`pair-subject-${index}-case-help`} value={slot.caseId ?? ""} disabled={selectorBusy || (index === 1 && !slots[0].caseId)} onChange={(event) => void loadCaseIntoSlot(index, event.target.value)}><option value="">选择正式案例</option>{cases.map((caseRecord) => <option value={caseRecord.id} key={caseRecord.id} disabled={caseRecord.id === otherCaseId}>{safeVisibleText(caseRecord.alias, "未命名案例", 140)} · {caseRecord.revisionCount} 修订</option>)}</select><small id={`pair-subject-${index}-case-help`}>{index === 1 && !slots[0].caseId ? "请先完成对象甲的案例选择。" : "另一侧已使用的 Case 会禁用。"}</small></label>
                  <label className="field"><span>确切 Revision</span><select aria-label={`对象${role}修订`} aria-describedby={`pair-subject-${index}-revision-help`} value={slot.revisionId ?? ""} disabled={!bundle || selectorBusy} onChange={(event) => chooseRevision(index, event.target.value)}><option value="">显式选择 Revision</option>{(bundle ? revisionsNewestFirstByCase.get(bundle.caseRecord.id) ?? [] : []).map((item) => <option value={item.id} key={item.id}>Revision {item.revisionNumber} · {safeVisibleText(item.ruleProfile.label, "未命名规则", 120)}</option>)}</select><small id={`pair-subject-${index}-revision-help`}>不会自动追随该案例未来新增的 Revision。</small></label>
                  {revision?.input.sex === "unspecified" ? <label className="field"><span>大运/小运人工顺逆</span><select aria-label={`对象${role}人工顺逆`} aria-describedby={`pair-subject-${index}-direction-help`} value={slot.manualDirection ?? ""} disabled={selectorBusy} onChange={(event) => setManualDirection(index, event.target.value)}><option value="">未选择 · 仅降级大运/小运</option><option value="forward">顺行</option><option value="backward">逆行</option></select><small id={`pair-subject-${index}-direction-help`}>该选择写入 URL，并只作用于本对象自己的运限。</small></label> : null}
                  {revision ? <dl><div><dt>规则</dt><dd>{safeVisibleText(revision.ruleProfile.calendar.dayBoundary, "未识别", 80)} · {shortHash(revision.manifest.ruleProfileDigest)}</dd></div><div><dt>修订摘要</dt><dd>{shortHash(revision.manifest.resultHash)}</dd></div></dl> : null}
                </fieldset>
              );
            })}
          </div>
        ) : null}

        {complete ? (
          <section className="pair-binding-ledger" aria-labelledby="pair-binding-ledger-title">
            <header className="pair-binding-ledger__heading">
              <div><p className="eyebrow">Exact source binding</p><h3 id="pair-binding-ledger-title">甲乙确切来源绑定</h3></div>
              <StatusPill tone="info">2 / 2 已锁定</StatusPill>
            </header>
            <div className="pair-binding-ledger__subjects">
              {selectionSummary.map((subject) => (
                <article key={subject.role} aria-label={`对象${subject.role}确切来源`}>
                  <header><span>{subject.role}</span><div><strong>{safeVisibleText(subject.alias, "未绑定案例", 160)}</strong><small>Revision {subject.revisionNumber ?? "—"}</small></div></header>
                  <dl>
                    <div><dt>Case ID</dt><dd><code>{safeVisibleText(subject.caseId, "未绑定", 160)}</code></dd></div>
                    <div><dt>Revision ID</dt><dd><code>{safeVisibleText(subject.revisionId, "未绑定", 160)}</code></dd></div>
                    <div><dt>规则快照</dt><dd>{safeVisibleText(subject.ruleProfile, "未绑定", 140)}{subject.ruleDigest ? <> · <code title={safeVisibleText(subject.ruleDigest, "摘要不可用", 180)}>{shortHash(subject.ruleDigest)}</code></> : null}</dd></div>
                    <div><dt>结果摘要</dt><dd><code title={subject.resultHash ? safeVisibleText(subject.resultHash, "摘要不可用", 180) : undefined}>{subject.resultHash ? shortHash(subject.resultHash) : "未绑定"}</code></dd></div>
                    <div><dt>人工顺逆</dt><dd>{subject.manualDirection === "forward" ? "顺行" : subject.manualDirection === "backward" ? "逆行" : "无人工覆盖"}</dd></div>
                  </dl>
                  {subject.caseId && subject.revisionId ? <AppLink className="text-link pair-source-link" href={revisionResearchHref(subject.caseId, subject.revisionId)}>研读对象{subject.role}的确切修订</AppLink> : null}
                </article>
              ))}
            </div>
            <p>这些身份用于复核本次事实投影的输入绑定；对象甲仍只是机械差异锚点，不代表主次、优劣、关系判断或专家结论。</p>
          </section>
        ) : null}
      </section>

      {error ? <div className="error-panel" role="alert"><strong>双案例研究未接受本次状态</strong><p>{safeVisibleText(error, "双案例状态不可用。")}</p>{/同一案例|同一个 Case|两个不同 Case/.test(error) ? <AppLink href="/compare" className="text-button">转到多盘 / 多规则对照</AppLink> : null}</div> : null}
      {routeSyncError ? <div className="error-panel pair-route-sync-error" role="alert"><strong>当前选择未写入分享链接</strong><p>{safeVisibleText(routeSyncError, "当前选择无法写入链接。")} 页面不会声称地址栏已经绑定当前对象；本地投影与链接状态保持分开。</p></div> : null}
      {projectionError ? <div className="error-panel pair-projection-error" role="alert"><strong>双案例事实投影失败</strong><p>{safeVisibleText(projectionError, "双案例事实投影失败。")} 旧工件已撤下，不会继续显示或导出。</p></div> : null}
      {notice ? <div className="settings-message" role="status">{safeVisibleText(notice, "操作状态已更新。")}</div> : null}
      {!libraryError && cases.length >= 2 ? (
        <div className="pair-projection-status" data-state={projectionStatus} role="status" aria-live="polite" aria-atomic="true">
          {projectionStatus === "selecting" || projectionStatus === "projecting" ? <LoaderCircle className="spin" aria-hidden="true" /> : projectionStatus === "ready" ? <ShieldCheck aria-hidden="true" /> : <Columns2 aria-hidden="true" />}
          <div>
            <strong>{safeVisibleText(projectionStatusTitle, "投影状态未识别", 120)}</strong>
             <p>{projectionStatus === "ready" && projection
               ? <>确切甲乙 Revision、UTC 与政策已固定到工件摘要 <code>{shortHash(projection.manifest.resultHash)}</code>。</>
               : projectionStatus === "failed"
                 ? "输入仍保留，但没有可展示、导出或作为下游依据的双案例工件。"
                 : projectionStatus === "selecting"
                   ? projection
                     ? "下方旧工件仍精确绑定提交前的甲乙来源；候选 Case 通过完整性检查前不会替换它。"
                     : "正在读取候选 Case；来源通过完整性检查前不会建立新的甲乙绑定。"
                 : projectionStatus === "incomplete"
                  ? "完成前不会生成、猜测或沿用旧的双案例投影。"
                  : "任何选择变化都会先撤下旧投影，再基于新绑定重新生成。"}</p>
          </div>
          <StatusPill tone={projectionStatus === "ready" ? "info" : projectionStatus === "failed" ? "cinnabar" : projectionStatus === "selecting" || projectionStatus === "projecting" ? "warning" : "neutral"}>{projectionStatus === "ready" ? "已绑定" : projectionStatus === "failed" ? "未生成" : projectionStatus === "selecting" || projectionStatus === "projecting" ? "处理中" : "等待"}</StatusPill>
        </div>
      ) : null}

      {projection ? (
        <dl className="pair-projection-proof" aria-label="当前双案例投影核对回执">
          <div><dt>来源绑定</dt><dd>对象甲 R{selectionSummary[0]?.revisionNumber ?? "—"} · 对象乙 R{selectionSummary[1]?.revisionNumber ?? "—"}</dd></div>
          <div><dt>共同 UTC</dt><dd><code>{safeVisibleText(pairResearchUtcMinute(projection.targetInstant), "时间未识别", 80)}</code></dd></div>
          <div><dt>政策边界</dt><dd><code>participant_facts_only</code></dd></div>
          <div><dt>投影摘要</dt><dd><code title={safeVisibleText(projection.manifest.resultHash, "摘要不可用", 180)}>{shortHash(projection.manifest.resultHash)}</code></dd></div>
        </dl>
      ) : null}

      {projection && displayProjection ? (
        <div className="formal-comparison-workspace pair-research-workspace">
          <div className="pair-workspace-context" role="note" aria-label="当前双案例研究上下文">
            <div className="pair-workspace-context__identity">
              <small>Bound pair</small>
              <strong>
                <span>{safeVisibleText(selectionSummary[0]?.alias, "对象甲", 100)}</span>
                <ArrowRightLeft aria-hidden="true" />
                <span>{safeVisibleText(selectionSummary[1]?.alias, "对象乙", 100)}</span>
              </strong>
              <p>甲 R{selectionSummary[0]?.revisionNumber ?? "—"} · 乙 R{selectionSummary[1]?.revisionNumber ?? "—"} · {pairResearchUtcMinute(projection.targetInstant)}</p>
            </div>
            <nav className="pair-workspace-context__nav" aria-label="双案例事实工作区">
              {PAIR_WORKSPACE_NAV.map((item, index) => (
                <a
                  key={item.id}
                  href={`#pair-research-${item.id}`}
                  aria-current={activeWorkspaceSection === item.id ? "location" : undefined}
                  onClick={() => setActiveWorkspaceSection(item.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.label}</strong>
                </a>
              ))}
            </nav>
            <p className="pair-workspace-context__boundary">
              <code>participant_facts_only</code>
              <span>只读事实 · 不生成跨盘关系</span>
            </p>
          </div>

          <section
            className="comparison-summary"
            id="pair-research-summary"
            data-pair-section="summary"
            aria-labelledby="pair-summary-title"
          >
            <div>
              <p className="eyebrow">Mechanical difference index</p>
              <h2 id="pair-summary-title">{displayProjection.matrix.differenceCount} 个字段存在值或可用状态差异</h2>
              <p className="pair-summary-boundary">差异数仅由两方各自冻结事实临时计算，用于定位阅读；不会写入双案例事实工件，也不构成变化轨迹、匹配度、跨盘命理判断或关系结论。</p>
            </div>
            <StatusPill tone="neutral">2 案例 · 只读事实层</StatusPill>
            <nav className="comparison-difference-index" aria-label="跳到双案例事实分组">
              {displayProjection.matrix.sections
                .filter((section) => !differencesOnly || section.differenceCount > 0)
                .map((section) => {
                  const targetId = `compare-section-${section.category}`;
                  return (
                    <a
                      href={`#${targetId}`}
                      key={section.category}
                      data-state={section.differenceCount > 0 ? "changed" : "same"}
                      aria-label={`${CATEGORY_SHORT_LABELS[section.category]}：${section.differenceCount} 个差异字段`}
                      onClick={(event) => {
                        event.preventDefault();
                        const target = document.getElementById(targetId);
                        if (!target) return;
                        if (window.location.hash !== `#${targetId}`) {
                          window.history.pushState(window.history.state, "", `#${targetId}`);
                        }
                        target.scrollIntoView?.({ block: "start" });
                        target.focus({ preventScroll: true });
                      }}
                    >
                      <span>{CATEGORY_SHORT_LABELS[section.category]}</span>
                      <strong>{section.differenceCount}</strong>
                    </a>
                  );
                })}
            </nav>
            <label className="comparison-difference-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />只看值或可用状态存在差异的字段</label>
          </section>

          <div id="pair-research-export" data-pair-section="export">
            <PairStructureReportExport
              key={projection.manifest.resultHash}
              projection={projection}
            />
          </div>

          <div id="pair-research-matrix" data-pair-section="matrix">
            <ComparisonMatrixTable projection={displayProjection} activeCompareIndex={1} differencesOnly={differencesOnly} mode="pair" />
          </div>

          <section
            className="comparison-transit-section"
            id="pair-research-transit"
            data-pair-section="transit"
            aria-labelledby="pair-transit-title"
          >
            <header className="section-heading-row">
              <div><p className="eyebrow">Same instant · separate facts</p><h2 id="pair-transit-title">同一 UTC 瞬时点 · 各自六层运限</h2></div>
              <StatusPill tone="warning">工程投影</StatusPill>
            </header>
            <form className="comparison-transit-form" data-state={transitDirty ? "draft" : "committed"} data-route-binding={routeBindingState} onSubmit={commitTransit}>
              <label className="field"><span>目标瞬时点（UTC）</span><input id="pair-research-transit-input" name="pairResearchTransitUtc" type="datetime-local" step="60" required aria-describedby="pair-research-transit-help" value={transitInput} onChange={(event) => { setTransitInput(event.target.value); setNotice(null); }} /><small id="pair-research-transit-help">同一瞬时点分别按两方自己的时区、规则与 Revision 计算；不据此推导跨盘关系。</small></label>
              <button type="submit" className="secondary-action" disabled={!transitDirty || projectionLoading || selectorBusy}><Clock3 aria-hidden="true" />{transitDirty ? "应用并重新计算" : "已同步两方运限"}</button>
              <div className="pair-transit-commit-state"><StatusPill tone={transitDirty ? "warning" : routeSyncError ? "cinnabar" : routeBound ? "info" : "warning"}>{transitDirty ? "草稿" : routeSyncError ? "链接未绑定" : routeBound ? "已应用" : "链接核对中"}</StatusPill><span>{transitDirty ? "输入尚未应用；下方仍绑定已提交的 UTC 瞬时点。" : routeSyncError ? "输入与当前事实投影使用同一 UTC 分钟，但地址栏未通过绑定核对。" : routeBound ? "输入、地址栏与当前事实投影使用同一 UTC 分钟。" : "输入与当前事实投影已一致；地址栏仍在等待规范链接核对。"}</span></div>
              <code aria-label="当前已应用的 UTC 瞬时点">{safeVisibleText(atInstant, "时间未识别", 100)}</code>
            </form>
            <TransitComparisonTable projection={displayProjection} activeCompareIndex={1} mode="pair" />
          </section>

          <footer className="comparison-evidence-footer pair-evidence-footer">
            <div><span>双案例工程事实工件摘要</span><code>{safeVisibleText(projection.manifest.resultHash, "摘要不可用", 180)}</code><small>用于绑定当前工程投影内容，不等于专家审核、领域真值或公开发布授权。</small></div>
            <p><code>participant_facts_only</code> · <code>scoreIncluded=false</code> · <code>compatibilityIncluded=false</code> · <code>crossChartDerivationIncluded=false</code>。当前仍是工程投影，不是命理金标或关系结论。</p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
