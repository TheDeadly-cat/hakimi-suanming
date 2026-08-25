import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Columns3,
  GitCompareArrows,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { shortHash } from "../lib/format";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
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
import "./compare-page.css";

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

type RuleVariantMutationClues = {
  requestedCaseId: string;
  sourceRevisionId: string;
  sourceRevisionNumber: number;
  sourceResultHash: string;
  requestedBoundary: "zi_start_23" | "midnight";
  expectedRuleProfileDigest: string;
  expectedResultHash: string;
  preCallLatestRevisionId: string;
  preCallRevisionCount: number;
};

type RuleVariantMutationIssue = RuleVariantMutationClues & {
  phase: "call_unknown" | "returned_unreconciled";
  returnedCaseId: string | null;
  returnedLatestRevisionId: string | null;
  returnedRevisionNumber: number | null;
  revisionHref: string | null;
  detail: string;
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
const COMPARISON_INTERNAL_ID_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._:-]{0,191}$/;
const COMPARISON_SHA256_PATTERN = /^[a-f0-9]{64}$/iu;
const COMPARISON_UNSAFE_TEXT_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_COMPARISON_CASES = 2_000;
const MAX_COMPARISON_REVISIONS_PER_CASE = 512;

function comparisonIdentifierIssue(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !COMPARISON_INTERNAL_ID_PATTERN.test(value)) {
    return `${label} 不是可接受的内部标识符，已拒绝读取、选择或建立深链。`;
  }
  return null;
}

function assertBoundedComparisonPayload(value: unknown, label: string): void {
  const activeObjects = new Set<object>();
  let visitedNodes = 0;

  const visit = (entry: unknown, depth: number): void => {
    visitedNodes += 1;
    if (visitedNodes > 200_000) throw new Error(`${label} 的运行时节点数量超出页面安全上限。`);
    if (depth > 20) throw new Error(`${label} 的运行时结构深度超出页面安全上限。`);
    if (typeof entry === "string") {
      if (entry.length > 16_384 || COMPARISON_UNSAFE_TEXT_PATTERN.test(entry)) {
        throw new Error(`${label} 包含过长文本或不安全控制字符。`);
      }
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) throw new Error(`${label} 包含非有限数值。`);
      return;
    }
    if (entry === null || entry === undefined || typeof entry === "boolean") return;
    if (typeof entry !== "object") throw new Error(`${label} 包含无法展示的运行时值。`);
    if (activeObjects.has(entry)) throw new Error(`${label} 包含循环引用，已拒绝展示。`);

    activeObjects.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > MAX_COMPARISON_CASES) {
        throw new Error(`${label} 的列表项目数量超出页面安全上限。`);
      }
      entry.forEach((item) => visit(item, depth + 1));
      activeObjects.delete(entry);
      return;
    }

    const keys = Object.keys(entry);
    if (keys.length > 256) throw new Error(`${label} 的字段数量超出页面安全上限。`);
    keys.forEach((key) => {
      if (key.length > 16_384 || COMPARISON_UNSAFE_TEXT_PATTERN.test(key)) {
        throw new Error(`${label} 包含过长字段名或不安全控制字符。`);
      }
      visit((entry as Record<string, unknown>)[key], depth + 1);
    });
    activeObjects.delete(entry);
  };

  visit(value, 0);
}

function comparisonCaseIndexIntegrityIssue(records: readonly CaseRecord[]): string | null {
  if (records.length > MAX_COMPARISON_CASES) {
    return `正式案例索引超过 ${MAX_COMPARISON_CASES.toLocaleString("zh-CN")} 条，已拒绝在单页建立选择器。`;
  }
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    return "正式案例索引包含重复 Case ID，已拒绝建立对照选择器。";
  }
  for (const record of records) {
    const caseIdIssue = comparisonIdentifierIssue(record.id, "案例索引 Case ID");
    if (caseIdIssue) return caseIdIssue;
    const latestRevisionIdIssue = comparisonIdentifierIssue(record.latestRevisionId, "案例索引 latestRevisionId");
    if (latestRevisionIdIssue) return latestRevisionIdIssue;
    if (
      !Number.isSafeInteger(record.revisionCount)
      || record.revisionCount < 1
      || record.revisionCount > MAX_COMPARISON_REVISIONS_PER_CASE
    ) {
      return "正式案例索引包含无效或超出单页上限的 Revision 数量。";
    }
  }
  return null;
}

function comparisonCaseAlias(value: unknown): string {
  return safeVisibleText(value, "未命名案例", 80);
}

function comparisonRuleProfileIdentity(revision: RevisionRecord): string {
  const profileId = safeVisibleText(revision.ruleProfile.profileId, "unknown-profile", 100);
  const profileVersion = safeVisibleText(revision.ruleProfile.profileVersion, "unknown-version", 80);
  return `${profileId}@${profileVersion}`;
}

function comparisonRulePackIdentity(revision: RevisionRecord): string {
  const binding = revision.rulePackBinding;
  if (!binding) return "内置 / 未绑定规则快照";
  const packId = safeVisibleText(binding.packId, "unknown-pack", 120);
  const useMode = safeVisibleText(binding.useMode, "unknown-mode", 80);
  return `${packId} · ${useMode} · ${shortHash(binding.packDigest)}`;
}

function comparisonEvidenceId(value: unknown): string {
  return safeVisibleText(value, "未记录", 160);
}

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

function comparisonBundleIntegrityIssue(bundle: CaseBundle, expectedCaseId: string): string | null {
  const caseIdIssue = comparisonIdentifierIssue(bundle.caseRecord.id, "案例包 Case ID");
  if (caseIdIssue) return caseIdIssue;
  if (bundle.caseRecord.id !== expectedCaseId) return "案例仓库返回了不匹配的 Case 来源。";
  if (!bundle.revisions.length) return "正式案例没有任何 Revision，不能加入对照。";
  if (bundle.revisions.length > MAX_COMPARISON_REVISIONS_PER_CASE) {
    return `案例包含超过 ${MAX_COMPARISON_REVISIONS_PER_CASE} 个 Revision，已拒绝在单页建立对照。`;
  }
  if (bundle.revisions.some((revision) =>
    comparisonIdentifierIssue(revision.id, "Revision ID") !== null
    || !Number.isSafeInteger(revision.revisionNumber)
    || revision.revisionNumber < 1
  )) {
    return "案例包含无效 Revision ID 或 Revision 序号。";
  }
  if (bundle.revisions.some((revision) =>
    !COMPARISON_SHA256_PATTERN.test(revision.manifest.resultHash)
    || !COMPARISON_SHA256_PATTERN.test(revision.manifest.ruleProfileDigest)
  )) {
    return "案例包含无效的 Revision 结果摘要或规则摘要。";
  }
  if (bundle.caseRecord.revisionCount !== bundle.revisions.length) {
    return `案例声明 ${bundle.caseRecord.revisionCount} 个 Revision，但实际读取到 ${bundle.revisions.length} 个。`;
  }
  if (new Set(bundle.revisions.map((revision) => revision.id)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision ID，无法建立唯一对照来源。";
  }
  if (new Set(bundle.revisions.map((revision) => revision.revisionNumber)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision 序号，无法建立唯一历史顺序。";
  }
  const orderedRevisionNumbers = bundle.revisions
    .map((revision) => revision.revisionNumber)
    .sort((left, right) => left - right);
  if (orderedRevisionNumbers.some((revisionNumber, index) => revisionNumber !== index + 1)) {
    return "案例 Revision 序号不连续，无法证明完整历史顺序。";
  }
  if (bundle.revisions.some((revision) => revision.caseId !== expectedCaseId)) {
    return "案例包混入了属于其他 Case 的 Revision。";
  }
  const latestRevisionIdIssue = comparisonIdentifierIssue(
    bundle.caseRecord.latestRevisionId,
    "latestRevisionId"
  );
  if (latestRevisionIdIssue) return latestRevisionIdIssue;
  const latestRevision = bundle.revisions.find((revision) => revision.id === bundle.caseRecord.latestRevisionId);
  if (!latestRevision) return "案例声明的 latestRevisionId 不在当前 Revision 集合中。";
  if (bundle.revisions.some((revision) => revision.revisionNumber > latestRevision.revisionNumber)) {
    return "案例声明的 latestRevisionId 未指向最高 Revision 序号。";
  }
  return null;
}

function comparisonProjectionBindingIssue(
  projection: FormalComparisonProjection,
  request: FormalComparisonRequest
): string | null {
  if (!/^[a-f0-9]{64}$/iu.test(projection.manifest.resultHash)) {
    return "正式对照投影缺少可核对的 64 位 SHA-256 结果摘要。";
  }
  if (projection.baselineSlotId !== request.baselineSlotId) {
    return "正式对照投影返回了未请求的基准槽位。";
  }
  const expectedTargetInstant = request.transit.mode === "same_instant"
    ? request.transit.atInstant
    : null;
  if (projection.targetInstant !== expectedTargetInstant) {
    return "正式对照投影返回的目标 UTC 与当前提交瞬时点不一致。";
  }
  if (projection.matrix.items.length !== request.slots.length) {
    return "正式对照投影返回的槽位数量与当前请求不一致。";
  }
  if (expectedTargetInstant !== null && projection.transits.length !== request.slots.length) {
    return "正式对照投影没有为每个槽位返回同步运限状态。";
  }
  const itemKeys: string[] = [];
  const revisionIds: string[] = [];
  for (const [index, expected] of request.slots.entries()) {
    const item = projection.matrix.items[index];
    if (!item) return `正式对照投影缺少槽位 ${expected.slotId}。`;
    if (
      item.slotId !== expected.slotId
      || item.caseId !== expected.caseId
      || item.revision.id !== expected.revisionId
      || item.revision.caseId !== expected.caseId
      || item.manualDirection !== expected.manualDirection
    ) {
      return `正式对照投影槽位 ${expected.slotId} 未绑定当前确切 Case、Revision 或人工顺逆。`;
    }
    if (comparisonIdentifierIssue(item.revision.id, `槽位 ${expected.slotId} Revision ID`)) {
      return `正式对照投影槽位 ${expected.slotId} 返回了无效 Revision ID。`;
    }
    if (!item.key.trim()) return `正式对照投影槽位 ${expected.slotId} 缺少稳定列键。`;
    itemKeys.push(item.key);
    revisionIds.push(item.revision.id);
  }
  if (new Set(itemKeys).size !== itemKeys.length) return "正式对照投影返回了重复列键。";
  if (new Set(revisionIds).size !== revisionIds.length) return "正式对照投影返回了重复 Revision。";
  return null;
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
  const [bundles, setBundles] = useState<Map<string, CaseBundle>>(() => new Map());
  const [slots, setSlots] = useState<SlotSelection[]>(() => [blankSlot()]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [selectorBusy, setSelectorBusy] = useState(false);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [savingRuleVariant, setSavingRuleVariant] = useState(false);
  const [projection, setProjection] = useState<FormalComparisonProjection | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [ruleVariantCommitIssue, setRuleVariantCommitIssue] = useState<RuleVariantMutationIssue | null>(null);
  const [libraryReloadVersion, setLibraryReloadVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [activeCompareIndex, setActiveCompareIndex] = useState(1);
  const [transitInput, setTransitInput] = useState(() => formalComparisonUtcMinute(fallbackAtInstant));
  const [transitInstant, setTransitInstant] = useState(fallbackAtInstant);
  const [routeSyncEnabled, setRouteSyncEnabled] = useState(false);
  const [sessionAccepted, setSessionAccepted] = useState(false);
  const [boundRouteHref, setBoundRouteHref] = useState<string | null>(null);
  const [routeSyncError, setRouteSyncError] = useState<string | null>(null);
  const selectorInFlightRef = useRef(false);
  const ruleVariantInFlightRef = useRef(false);
  const ruleVariantMutationLockedRef = useRef(false);
  const sessionEpochRef = useRef(0);

  useEffect(() => {
    let active = true;
    const sessionEpoch = sessionEpochRef.current + 1;
    sessionEpochRef.current = sessionEpoch;
    selectorInFlightRef.current = false;
    ruleVariantInFlightRef.current = false;
    const load = async () => {
      setLibraryLoading(true);
      setSelectorBusy(false);
      setSavingRuleVariant(false);
      setLibraryError(null);
      setError(null);
      setNotice(null);
      setCases([]);
      setBundles(new Map());
      setSlots([blankSlot()]);
      setProjection(null);
      setProjectionLoading(false);
      setRouteSyncEnabled(false);
      setSessionAccepted(false);
      setBoundRouteHref(null);
      setRouteSyncError(null);
      setTransitInput(formalComparisonUtcMinute(fallbackAtInstant));
      setTransitInstant(fallbackAtInstant);
      setActiveCompareIndex(1);
      try {
        let caseRows: CaseRecord[];
        try {
          caseRows = await caseRepository.listCases();
          assertBoundedComparisonPayload(caseRows, "正式案例索引");
        } catch (reason) {
          if (active) {
            setLibraryError(safeVisibleErrorMessage(reason, "无法读取正式命盘案例索引。"));
          }
          return;
        }

        if (!active) return;
        const caseIndexIntegrityIssue = comparisonCaseIndexIntegrityIssue(caseRows);
        if (caseIndexIntegrityIssue) {
          setLibraryError(caseIndexIntegrityIssue);
          return;
        }
        setCases(caseRows);

        try {
          const route = parseFormalComparisonRoute(location.search, fallbackAtInstant);
          for (const [slotIndex, slot] of route.slots.entries()) {
            const routeSlotLabel = slotLabel(slotIndex);
            const caseIdIssue = slot.caseId
              ? comparisonIdentifierIssue(slot.caseId, `链接槽位 ${routeSlotLabel} Case ID`)
              : null;
            const revisionIdIssue = slot.revisionId
              ? comparisonIdentifierIssue(slot.revisionId, `链接槽位 ${routeSlotLabel} Revision ID`)
              : null;
            if (caseIdIssue || revisionIdIssue) throw new Error(caseIdIssue ?? revisionIdIssue ?? "链接标识符不可用。");
          }
          const requestedRevisionIds = route.slots.flatMap((slot) => slot.revisionId ? [slot.revisionId] : []);
          if (new Set(requestedRevisionIds).size !== requestedRevisionIds.length) {
            throw new Error("同一正式修订不能在 URL 中重复加入对照。");
          }
          const requestedCaseIds = [...new Set(route.slots.flatMap((slot) => slot.caseId ? [slot.caseId] : []))];
          const loaded = await Promise.all(requestedCaseIds.map(async (caseId) => {
            const bundle = await caseRepository.getCase(caseId);
            if (!bundle) throw new Error(`链接中的案例 ${caseId} 已不存在。`);
            assertBoundedComparisonPayload(bundle, `链接中的案例 ${caseId}`);
            const integrityIssue = comparisonBundleIntegrityIssue(bundle, caseId);
            if (integrityIssue) throw new Error(`链接中的案例 ${caseId} 完整性未通过：${integrityIssue}`);
            return bundle;
          }));
          const loadedMap = new Map(loaded.map((bundle) => [bundle.caseRecord.id, bundle]));
          for (const slot of route.slots) {
            if (!slot.caseId || !slot.revisionId) continue;
            const bundle = loadedMap.get(slot.caseId);
            if (!bundle?.revisions.some((revision) => revision.id === slot.revisionId)) {
              throw new Error(`链接中的修订 ${slot.revisionId} 已不存在，未静默替换为最新修订。`);
            }
          }
          if (active) {
            setBundles(loadedMap);
            setSlots(route.slots.map((slot) => ({ ...slot, selectionId: crypto.randomUUID() })));
            setTransitInput(formalComparisonUtcMinute(route.atInstant));
            setTransitInstant(route.atInstant);
            setActiveCompareIndex(activeCompareIndexForFocus(route.focusSlotId));
            setSessionAccepted(true);
            setRouteSyncEnabled(true);
          }
        } catch (reason) {
          if (active) {
            setBundles(new Map());
            setSlots([blankSlot()]);
            setError(safeVisibleErrorMessage(reason, "无法读取正式命盘对照来源。"));
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
        selectorInFlightRef.current = false;
        ruleVariantInFlightRef.current = false;
      }
    };
  }, [fallbackAtInstant, libraryReloadVersion, location.search]);

  const completeSlots = useMemo(() => slots.filter((slot) => slot.caseId && slot.revisionId), [slots]);
  const revisionsNewestFirstByCase = useMemo(() => new Map(
    [...bundles.entries()].map(([caseId, bundle]) => [
      caseId,
      [...bundle.revisions].sort((left, right) =>
        right.revisionNumber - left.revisionNumber || left.id.localeCompare(right.id)
      )
    ])
  ), [bundles]);
  const sessionBusy = selectorBusy || savingRuleVariant;
  const sessionLocked = sessionBusy || ruleVariantCommitIssue !== null;
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
  const canonicalRoute = useMemo(() => {
    if (!sessionAccepted || completeSlots.length !== slots.length) {
      return { href: null, issue: null };
    }
    try {
      const routeActiveCompareIndex = normalizedActiveCompareIndex(activeCompareIndex, completeSlots.length);
      return {
        href: serializeFormalComparisonRoute({
          slots: completeSlots,
          atInstant: transitInstant,
          focusSlotId: focusSlotForIndex(routeActiveCompareIndex)
        }),
        issue: null
      };
    } catch (reason) {
      return { href: null, issue: safeVisibleErrorMessage(reason, "正式对照链接无法序列化。") };
    }
  }, [activeCompareIndex, completeSlots, sessionAccepted, slots.length, transitInstant]);

  useEffect(() => {
    if (!sessionAccepted || completeSlots.length !== slots.length || completeSlots.length < 2) {
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
        assertBoundedComparisonPayload(sources, "正式对照来源");
        const next = await projectFormalComparison(request, sources);
        assertBoundedComparisonPayload(next, "正式对照投影");
        const bindingIssue = comparisonProjectionBindingIssue(next, request);
        if (bindingIssue) throw new Error(bindingIssue);
        if (active) setProjection(next);
      } catch (reason) {
        if (active) setError(safeVisibleErrorMessage(reason, "正式命盘对照失败。"));
      } finally {
        if (active) setProjectionLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [completeSlots.length, sessionAccepted, slots, transitInstant]);

  useEffect(() => {
    // A cold production boot binds its readiness proof to the exact URL that
    // was requested. Canonicalize only after that proof, or after a later
    // in-app interaction changes one of these dependencies.
    if (
      !appBootReady ||
      !routeSyncEnabled ||
      !sessionAccepted ||
      completeSlots.length !== slots.length
    ) {
      setBoundRouteHref(null);
      return;
    }
    if (canonicalRoute.issue || !canonicalRoute.href) {
      setBoundRouteHref(null);
      setRouteSyncError(canonicalRoute.issue ?? "正式对照链接无法序列化。");
      return;
    }
    const expectedRoute = canonicalRoute.href;
    try {
      if (`${window.location.pathname}${window.location.search}` !== expectedRoute) {
        window.history.replaceState(window.history.state, "", `${expectedRoute}${window.location.hash}`);
      }
      if (`${window.location.pathname}${window.location.search}` !== expectedRoute) {
        throw new Error("浏览器未接受当前正式对照规范链接。");
      }
      setBoundRouteHref(expectedRoute);
      setRouteSyncError(null);
    } catch (reason) {
      setBoundRouteHref(null);
      setRouteSyncError(safeVisibleErrorMessage(reason, "正式对照链接无法序列化。"));
    }
  }, [appBootReady, canonicalRoute, completeSlots.length, routeSyncEnabled, sessionAccepted, slots.length]);

  const routeBound = canonicalRoute.href !== null
    && boundRouteHref === canonicalRoute.href
    && routeSyncError === null;
  const routeBindingState = routeSyncError
    ? "failed"
    : routeBound
      ? "bound"
      : routeSyncEnabled && sessionAccepted
        ? "pending"
        : "disabled";

  useEffect(() => {
    if (slots.length < 2) return;
    setActiveCompareIndex((current) => Math.min(Math.max(current, 1), slots.length - 1));
  }, [slots.length]);

  const acceptUserSession = () => {
    setSessionAccepted(true);
    setRouteSyncEnabled(true);
    setRouteSyncError(null);
  };

  const sessionOperationLocked = () =>
    selectorInFlightRef.current
    || ruleVariantInFlightRef.current
    || ruleVariantMutationLockedRef.current;

  const loadCaseIntoSlot = async (index: number, caseId: string) => {
    if (sessionOperationLocked()) return;
    const operationEpoch = sessionEpochRef.current;
    selectorInFlightRef.current = true;
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
      const caseIdIssue = comparisonIdentifierIssue(caseId, "所选 Case ID");
      if (caseIdIssue) throw new Error(caseIdIssue);
      if (!cases.some((caseRecord) => caseRecord.id === caseId)) {
        throw new Error("所选 Case ID 不属于当前已核对的案例索引。 ");
      }
      let bundle = bundles.get(caseId);
      if (!bundle) {
        bundle = await caseRepository.getCase(caseId) ?? undefined;
        if (operationEpoch !== sessionEpochRef.current) return;
        if (!bundle) throw new Error("所选案例已经不存在。");
        assertBoundedComparisonPayload(bundle, "所选案例包");
      }
      const integrityIssue = comparisonBundleIntegrityIssue(bundle, caseId);
      if (integrityIssue) throw new Error(`所选案例完整性未通过：${integrityIssue}`);
      if (operationEpoch !== sessionEpochRef.current) return;
      if (!bundles.has(caseId)) {
        setBundles((current) => new Map(current).set(caseId, bundle!));
      }
      setSlots((current) => current.map((slot, slotIndex) => slotIndex === index
        ? { ...slot, caseId, revisionId: null, manualDirection: null }
        : slot));
      setNotice(`已载入案例“${comparisonCaseAlias(bundle.caseRecord.alias)}”；请明确选择确切 Revision，未自动绑定最新修订。`);
    } catch (reason) {
      if (operationEpoch === sessionEpochRef.current) {
        setError(safeVisibleErrorMessage(reason, "无法读取所选案例。"));
      }
    } finally {
      if (operationEpoch === sessionEpochRef.current) {
        selectorInFlightRef.current = false;
        setSelectorBusy(false);
      }
    }
  };

  const chooseRevision = (index: number, revisionId: string) => {
    if (sessionOperationLocked()) return;
    if (revisionId) {
      const revisionIdIssue = comparisonIdentifierIssue(revisionId, "所选 Revision ID");
      if (revisionIdIssue) {
        setError(revisionIdIssue);
        return;
      }
      const slot = slots[index];
      if (!slot?.caseId || !bundles.get(slot.caseId)?.revisions.some((revision) => revision.id === revisionId)) {
        setError("所选 Revision 不属于当前槽位已核对的 Case Bundle。");
        return;
      }
    }
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
    if (sessionOperationLocked()) return;
    acceptUserSession();
    setSlots((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setNotice(from === 0 || to === 0
      ? "槽位顺序已更新，A 基准已重新绑定；全部差异将按新基准重新计算。"
      : "比较盘顺序已更新；A 基准保持不变。"
    );
  };

  const removeSlot = (index: number) => {
    if (sessionOperationLocked()) return;
    acceptUserSession();
    setSlots((current) => current.length === 1 ? [blankSlot()] : current.filter((_, slotIndex) => slotIndex !== index));
    setNotice(slots.length === 1
      ? "已清空 A 对照位；当前没有可投影的正式修订。"
      : index === 0
        ? "已移除原 A；原 B 已成为新的 A 基准，全部差异将重新计算。"
        : `已移除比较盘 ${slotLabel(index)}；A 基准保持不变。`
    );
  };

  const addSlot = () => {
    if (sessionOperationLocked()) return;
    acceptUserSession();
    setSlots((current) => current.length < 4 ? [...current, blankSlot()] : current);
  };

  const setManualDirection = (index: number, value: string) => {
    if (sessionOperationLocked()) return;
    if (value !== "" && value !== "forward" && value !== "backward") {
      setError("人工顺逆只接受未指定、顺行或逆行。 ");
      return;
    }
    setError(null);
    acceptUserSession();
    setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      manualDirection: value ? value as "forward" | "backward" : null
    } : item));
  };

  const saveOppositeRuleRevision = async () => {
    if (sessionOperationLocked()) return;
    const operationEpoch = sessionEpochRef.current;
    const slot = completeSlots[0];
    if (!slot?.caseId || !slot.revisionId) return;
    const revision = selectedRevision(slot, bundles);
    if (!revision) {
      setError("找不到用于派生规则的确切修订。");
      return;
    }
    const sourceBundle = bundles.get(slot.caseId);
    if (!sourceBundle) {
      setError("找不到用于冻结调用前状态的 Case Bundle。");
      return;
    }
    ruleVariantInFlightRef.current = true;
    setSavingRuleVariant(true);
    setError(null);
    setNotice(null);
    acceptUserSession();
    let writeAttempt: RuleVariantMutationClues | null = null;
    let writeCallStarted = false;
    let returnedCommit: RuleVariantMutationIssue | null = null;
    try {
      const originalHash = revision.manifest.resultHash;
      const boundary = alternateBoundary(revision);
      const ruleProfile = withDayBoundaryFromProfile(revision.ruleProfile, boundary);
      const calculated = await calculateChart(revision.input, ruleProfile);
      if (operationEpoch !== sessionEpochRef.current) return;
      assertBoundedComparisonPayload(calculated, "相反换日规则计算结果");
      if (
        !COMPARISON_SHA256_PATTERN.test(calculated.manifest.resultHash)
        || !COMPARISON_SHA256_PATTERN.test(calculated.manifest.ruleProfileDigest)
      ) {
        throw new Error("相反换日规则计算没有返回有效 SHA-256 摘要。 ");
      }
      if (
        calculated.manifest.resultHash === originalHash
        || calculated.manifest.ruleProfileDigest === revision.manifest.ruleProfileDigest
      ) {
        throw new Error("相反换日规则计算没有形成可区分的新结果与规则摘要。 ");
      }
      writeAttempt = {
        requestedCaseId: slot.caseId,
        sourceRevisionId: revision.id,
        sourceRevisionNumber: revision.revisionNumber,
        sourceResultHash: originalHash,
        requestedBoundary: boundary,
        expectedRuleProfileDigest: calculated.manifest.ruleProfileDigest,
        expectedResultHash: calculated.manifest.resultHash,
        preCallLatestRevisionId: sourceBundle.caseRecord.latestRevisionId,
        preCallRevisionCount: sourceBundle.caseRecord.revisionCount
      };
      writeCallStarted = true;
      const updated = await caseRepository.addRevision(slot.caseId, calculated);
      assertBoundedComparisonPayload(updated, "规则修订写入返回 Bundle");
      const updatedIntegrityIssue = comparisonBundleIntegrityIssue(updated, slot.caseId);
      if (updatedIntegrityIssue) {
        throw new Error(`规则修订写入返回 Bundle 完整性未通过：${updatedIntegrityIssue}`);
      }
      const preserved = updated.revisions.find((item) => item.id === revision.id);
      const created = updated.revisions.find((item) => item.id === updated.caseRecord.latestRevisionId);
      returnedCommit = {
        ...writeAttempt,
        phase: "returned_unreconciled",
        returnedCaseId: updated.caseRecord.id,
        returnedLatestRevisionId: updated.caseRecord.latestRevisionId,
        returnedRevisionNumber: created?.revisionNumber ?? null,
        revisionHref: updated.caseRecord.id === slot.caseId && created?.caseId === slot.caseId
          ? revisionResearchHref(slot.caseId, created.id)
          : null,
        detail: "写入调用已经返回，但尚未完成返回 Bundle 与当前对照会话的后处理核对。"
      };
      writeCallStarted = false;
      ruleVariantMutationLockedRef.current = true;
      if (!preserved || preserved.manifest.resultHash !== originalHash) {
        throw new Error("规则修订可能已经写入，但返回 Bundle 无法证明原修订保持不变；请到案例库核对。");
      }
      if (
        updated.caseRecord.id !== slot.caseId ||
        updated.caseRecord.revisionCount !== writeAttempt.preCallRevisionCount + 1 ||
        updated.caseRecord.latestRevisionId === writeAttempt.preCallLatestRevisionId ||
        !created ||
        created.id === revision.id ||
        created.revisionNumber !== writeAttempt.preCallRevisionCount + 1 ||
        created.caseId !== slot.caseId ||
        created.manifest.resultHash !== calculated.manifest.resultHash ||
        created.manifest.ruleProfileDigest !== calculated.manifest.ruleProfileDigest
      ) {
        throw new Error("规则修订可能已经写入，但返回 Bundle 无法证明 latestRevisionId 精确指向本次计算；请到案例库核对。");
      }
      if (operationEpoch !== sessionEpochRef.current) {
        setRuleVariantCommitIssue({
          ...returnedCommit,
          detail: "规则修订写入调用已返回且返回 Bundle 通过当前检查，但对照会话在后处理完成前已经切换。旧异步结果没有写入新会话；请先核对返回 Revision。"
        });
        return;
      }
      setBundles((current) => new Map(current).set(updated.caseRecord.id, updated));
      setSlots((current) => {
        const nextSlot = { ...blankSlot(), caseId: updated.caseRecord.id, revisionId: created.id };
        const emptyIndex = current.findIndex((item) => !item.caseId || !item.revisionId);
        if (emptyIndex >= 0) return current.map((item, index) => index === emptyIndex ? nextSlot : item);
        return current.length < 4 ? [...current, nextSlot] : current;
      });
      setActiveCompareIndex(1);
      setNotice(`已追加 Revision ${created.revisionNumber}：只改变换日与强耦合的子时日干基准，原修订保持不变。`);
      ruleVariantMutationLockedRef.current = false;
      setRuleVariantCommitIssue(null);
    } catch (reason) {
      if (returnedCommit) {
        setRuleVariantCommitIssue({
          ...returnedCommit,
          detail: safeVisibleErrorMessage(
            reason,
            "规则修订写入调用已返回，但页面未完成返回 Bundle 核对。"
          )
        });
        return;
      }
      if (writeCallStarted && writeAttempt) {
        ruleVariantMutationLockedRef.current = true;
        setRuleVariantCommitIssue({
          ...writeAttempt,
          phase: "call_unknown",
          returnedCaseId: null,
          returnedLatestRevisionId: null,
          returnedRevisionNumber: null,
          revisionHref: null,
          detail: `写入调用已开始但未取得可信返回值：${safeVisibleErrorMessage(reason, "仓库调用抛出未知错误。")}`
        });
        return;
      }
      if (operationEpoch === sessionEpochRef.current) {
        setError(safeVisibleErrorMessage(reason, "无法保存换日规则对照修订。"));
      }
    } finally {
      if (operationEpoch === sessionEpochRef.current) {
        ruleVariantInFlightRef.current = false;
        setSavingRuleVariant(false);
      }
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
  const canCompare = !libraryError && allSlotsComplete && slots.length >= 2;
  const transitDirty = transitInput !== formalComparisonUtcMinute(transitInstant);
  const baselineSlot = slots[0] ?? null;
  const baselineBundle = baselineSlot?.caseId ? bundles.get(baselineSlot.caseId) : null;
  const baselineRevision = baselineSlot ? selectedRevision(baselineSlot, bundles) : null;
  const baselineIdentity = baselineBundle && baselineRevision
    ? `${comparisonCaseAlias(baselineBundle.caseRecord.alias)} · R${baselineRevision.revisionNumber}`
    : "尚未绑定";
  const projectionState = projectionLoading
    ? "正在复核摘要与来源绑定"
    : projection && comparisonDisplay
      ? `${comparisonDisplay.differenceCount} 个差异字段`
      : canCompare
        ? "等待来源投影"
        : "等待完整选择";

  return (
    <div
      className="page page--compare"
      data-stage={projection ? "projected" : canCompare ? "verifying" : "selecting"}
      data-rule-mutation={ruleVariantCommitIssue?.phase ?? "clear"}
      data-route-binding-state={routeBindingState}
      data-release-identity="legacy-v13"
      data-release-family="legacy"
      data-db-generation={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}
      data-schema-version="13"
      data-db-schema-version="13"
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.engineeringEvidenceOnly)}
      data-evidence-authority="engineering-only"
      data-formal-validation-complete="false"
      data-scientific-validation-complete="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-mode="epoch-governed-user-initiated-writes"
      data-mutation-epoch-bypassed="false"
      data-mutation-epoch-state="not_bypassed"
      data-write-reconciliation-required={ruleVariantCommitIssue ? "true" : "false"}
      data-session-locked={sessionLocked}
      data-active-compare-slot={projection && comparisonDisplay ? slotLabel(displayActiveCompareIndex) : "none"}
      data-differences-only={differencesOnly}
    >
      <div className="compare-masthead">
        <PageHeading
          eyebrow="Comparison desk"
          title="正式命盘对照台"
          description="选择 2～4 个确切 Revision，以 A 为基准对齐输入、校时、完整四柱、规则、来源版本和同一 UTC 瞬时点的六层运限。候选探针保持独立研究入口，不伪装成正式出生盘。"
        />
        <ol className="comparison-progress" aria-label="正式对照会话进度">
          <li data-state={allSlotsComplete && slots.length >= 2 ? "complete" : completeSlots.length ? "active" : "pending"}>
            <span aria-hidden="true">01</span><div><strong>选择修订</strong><small>{completeSlots.length} / {slots.length} 个槽位完成</small></div>
          </li>
          <li data-state={projectionLoading ? "active" : projection ? "complete" : canCompare ? "active" : "pending"}>
            <span aria-hidden="true">02</span><div><strong>来源复核</strong><small>{projectionLoading ? "正在重算摘要与绑定" : projection ? "当前来源投影已生成" : canCompare ? "等待投影" : "等待完整选择"}</small></div>
          </li>
          <li data-state={projection ? "complete" : "pending"}>
            <span aria-hidden="true">03</span><div><strong>差异投影</strong><small>{comparisonDisplay ? `${comparisonDisplay.differenceCount} 个字段存在差异` : "尚未生成"}</small></div>
          </li>
        </ol>
      </div>
      <ComparisonModeNav active="formal" />

      <section className="comparison-session" data-ready={canCompare ? "true" : "false"} aria-labelledby="comparison-session-title" aria-busy={sessionBusy || undefined}>
        <header className="section-heading-row">
          <div><p className="eyebrow">Stable revision session</p><h2 id="comparison-session-title">选择并排列正式修订</h2></div>
          <StatusPill tone="info">2—4 盘</StatusPill>
        </header>
        <p className="comparison-session-intro">URL 只保存案例与修订 ID，不写入出生资料或别名；刷新后仍读取同一修订，来源被删除或篡改时会明确拒绝。</p>
        <dl className="comparison-session-facts" aria-label="当前正式对照会话事实">
          <div data-state={routeBound ? "bound" : routeSyncError ? "failed" : "checking"}><dt>路由来源</dt><dd>{routeBound ? "当前 URL 已绑定" : routeSyncError ? "当前 URL 未绑定" : "正在核对规范 URL"}</dd></div>
          <div data-state={baselineRevision ? "bound" : "pending"}><dt>A 基准</dt><dd title={baselineIdentity}>{baselineIdentity}</dd></div>
          <div><dt>同步瞬时点</dt><dd><time dateTime={transitInstant}>{transitInstant}</time></dd></div>
          <div data-state={projection ? "bound" : projectionLoading ? "checking" : "pending"}><dt>差异投影</dt><dd>{projectionState}</dd></div>
        </dl>
        {sessionBusy ? (
          <div className="comparison-session-operation" role="status" aria-live="polite">
            <LoaderCircle className="spin" aria-hidden="true" />
            <div><strong>{savingRuleVariant ? "正在生成并保存相反换日 Revision" : "正在读取所选案例的精确修订"}</strong><small>当前槽位顺序与选择已冻结；完成前不会把异步结果写入另一个对照位。</small></div>
          </div>
        ) : null}

        {libraryLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在读取案例索引</div> : null}
        {!libraryLoading && libraryError ? (
          <div className="comparison-library-unavailable" role="alert">
            <span className="comparison-library-unavailable__mark" aria-hidden="true"><Columns3 /></span>
            <div>
              <p className="eyebrow">Case index unavailable</p>
              <strong>案例索引暂不可用</strong>
              <p>{safeVisibleText(libraryError, "案例索引返回了不可显示的错误。", 900)}</p>
              <small>本页已清除旧选择与旧投影；读取失败不会被解释为“没有案例”。</small>
            </div>
            <button type="button" className="secondary-action" onClick={() => setLibraryReloadVersion((current) => current + 1)}>
              <RefreshCw aria-hidden="true" />重新读取案例索引
            </button>
          </div>
        ) : null}
        {!libraryLoading && !libraryError && cases.length === 0 ? (
          <div className="empty-list"><Columns3 aria-hidden="true" /><h2>先保存一张正式命盘</h2><p>随后可对照不同案例，或为同一案例追加规则 Revision；未知时辰候选组不会混入正式对照。</p><div className="comparison-empty-actions"><AppLink href="/new" className="primary-action">新建正式案例</AppLink><AppLink href="/new?demo=1" className="secondary-action">使用固定演示</AppLink></div></div>
        ) : null}

        {!libraryError && cases.length > 0 ? (
          <div className="comparison-slot-list" role="group" aria-label="正式命盘对照位；窄屏可横向滚动查看" tabIndex={0}>
            {slots.map((slot, index) => {
              const bundle = slot.caseId ? bundles.get(slot.caseId) : undefined;
              const revision = selectedRevision(slot, bundles);
              return (
                <article
                  className={`comparison-slot-card${index === 0 ? " is-baseline" : ""}${revision ? " is-complete" : ""}`}
                  data-slot={slotLabel(index)}
                  aria-label={`${slotLabel(index)} 对照位 · ${index === 0 ? "基准盘" : "比较盘"}${revision ? ` · Revision ${revision.revisionNumber}` : " · 尚未完成选择"}`}
                  key={slot.selectionId}
                >
                  <header>
                    <span className="comparison-slot-mark">{slotLabel(index)}</span>
                    <div><strong>{index === 0 ? "基准盘" : `比较盘 ${slotLabel(index)}`}</strong><small>{revision ? `Revision ${revision.revisionNumber}` : "尚未完成选择"}</small></div>
                    <button type="button" className="icon-button" disabled={sessionLocked} aria-label={`移除对照位 ${slotLabel(index)}`} onClick={() => removeSlot(index)}><X aria-hidden="true" /></button>
                  </header>
                  <label className="field"><span>案例</span><select aria-label={`对照位 ${slotLabel(index)} 案例`} value={slot.caseId ?? ""} disabled={sessionLocked} onChange={(event) => void loadCaseIntoSlot(index, event.target.value)}><option value="">选择正式案例</option>{cases.map((caseRecord) => <option value={caseRecord.id} key={caseRecord.id}>{comparisonCaseAlias(caseRecord.alias)} · {caseRecord.revisionCount} 修订</option>)}</select></label>
                  <label className="field"><span>确切修订</span><select aria-label={`对照位 ${slotLabel(index)} 修订`} value={slot.revisionId ?? ""} disabled={!bundle || sessionLocked} onChange={(event) => chooseRevision(index, event.target.value)}><option value="">选择 Revision</option>{(bundle ? revisionsNewestFirstByCase.get(bundle.caseRecord.id) ?? [] : []).map((item) => <option value={item.id} key={item.id} disabled={slots.some((other, otherIndex) => otherIndex !== index && other.revisionId === item.id)}>Revision {item.revisionNumber} · {safeVisibleText(item.ruleProfile.label, "未命名规则配置", 120)}</option>)}</select></label>
                  {bundle && !revision ? (
                    <div className="comparison-explicit-choice" role="status">
                      <span aria-hidden="true">R?</span>
                      <div><strong>等待明确 Revision</strong><small>案例索引已载入；请亲自选择一条确切修订，系统不会自动绑定 latestRevisionId。</small></div>
                    </div>
                  ) : null}
                  {revision?.input.sex === "unspecified" ? <label className="field"><span>大运/小运顺逆</span><select aria-label={`对照位 ${slotLabel(index)} 人工顺逆`} value={slot.manualDirection ?? ""} disabled={sessionLocked} onChange={(event) => setManualDirection(index, event.target.value)}><option value="">未选择 · 仅降级大运/小运</option><option value="forward">顺行</option><option value="backward">逆行</option></select></label> : null}
                  {revision ? <dl><div><dt>规则配置</dt><dd>{comparisonRuleProfileIdentity(revision)} · {revision.ruleProfile.calendar.dayBoundary} · {shortHash(revision.manifest.ruleProfileDigest)}</dd></div><div><dt>规则包来源</dt><dd>{comparisonRulePackIdentity(revision)}</dd></div><div><dt>结果</dt><dd>{shortHash(revision.manifest.resultHash)}</dd></div></dl> : null}
                  {revision && slot.caseId ? (
                    <AppLink
                      className="text-link comparison-revision-link"
                      href={revisionResearchHref(slot.caseId, revision.id)}
                      aria-label={`研读对照位 ${slotLabel(index)}：${bundle ? comparisonCaseAlias(bundle.caseRecord.alias) : revision.caseId} · Revision ${revision.revisionNumber}`}
                    >
                      研读此修订
                    </AppLink>
                  ) : null}
                  <div className="comparison-slot-actions">
                    <button type="button" className="text-button" disabled={sessionLocked || index === 0} onClick={() => moveSlot(index, 0)}>设为 A 基准</button>
                    <button type="button" className="icon-button" aria-label={`${slotLabel(index)} 左移`} disabled={sessionLocked || index === 0} onClick={() => moveSlot(index, index - 1)}><ArrowLeft aria-hidden="true" /></button>
                    <button type="button" className="icon-button" aria-label={`${slotLabel(index)} 右移`} disabled={sessionLocked || index === slots.length - 1} onClick={() => moveSlot(index, index + 1)}><ArrowRight aria-hidden="true" /></button>
                  </div>
                </article>
              );
            })}
            {slots.length < 4 ? <button type="button" className="comparison-add-slot" disabled={sessionLocked} onClick={addSlot}><Plus aria-hidden="true" /><span>添加比较盘</span><small>最多四个确切 Revision</small></button> : null}
          </div>
        ) : null}

        {completeSlots.length === 1 ? (
          <div className="comparison-rule-variant">
            <GitCompareArrows aria-hidden="true" />
            <div><strong>需要同盘不同规则？</strong><p>从当前确切修订克隆完整规则，只改变换日与其强耦合的子时日干基准；先追加为新 Revision，再进入正式对照。</p></div>
            <button type="button" className="secondary-action" disabled={sessionLocked} aria-busy={savingRuleVariant} onClick={() => void saveOppositeRuleRevision()}>{savingRuleVariant ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{savingRuleVariant ? "正在生成并保存" : "生成并保存相反换日修订"}</button>
          </div>
        ) : null}
      </section>

      {error ? <div className="error-panel" role="alert"><strong>对照台未接受本次状态</strong><p>{safeVisibleText(error, "正式对照返回了不可显示的错误。", 900)}</p></div> : null}
      {routeSyncError ? <div className="error-panel comparison-route-sync-error" role="alert"><strong>当前选择未绑定到分享链接</strong><p>{safeVisibleText(routeSyncError, "正式对照链接未通过绑定核对。")} 本地投影仍按确切 Revision 与已提交 UTC 保持只读，但页面不会声称地址栏可复现当前会话。</p></div> : null}
      {notice ? <div className="settings-message" role="status">{safeVisibleText(notice, "正式对照状态已更新。", 900)}</div> : null}
      {ruleVariantCommitIssue ? (
        <section
          className="comparison-rule-commit-issue"
          data-phase={ruleVariantCommitIssue.phase}
          role="alert"
          aria-labelledby="comparison-rule-commit-title"
        >
          <header>
            <Save aria-hidden="true" />
            <div>
              <p className="eyebrow">Mutation reconciliation</p>
              <h2 id="comparison-rule-commit-title">
                {ruleVariantCommitIssue.phase === "call_unknown"
                  ? "写入结果未知，禁止重复派生"
                  : "写入调用已返回，禁止重复派生"}
              </h2>
            </div>
            <StatusPill tone="warning">
              {ruleVariantCommitIssue.phase === "call_unknown" ? "调用未知" : "待核对"}
            </StatusPill>
          </header>
          <p>
            {safeVisibleText(ruleVariantCommitIssue.detail, "写入核对信息不可显示。", 900)} {ruleVariantCommitIssue.phase === "call_unknown"
              ? "调用可能已提交，也可能未提交；本页不会按普通失败解锁。请先到案例库按下列冻结线索核对。"
              : "本页不会把该返回值冒充完整成功，也不会解除本次会话的重复写入锁。"}
          </p>
          <dl>
            <div><dt>请求 Case</dt><dd>{comparisonEvidenceId(ruleVariantCommitIssue.requestedCaseId)}</dd></div>
            <div><dt>源 Revision</dt><dd>R{ruleVariantCommitIssue.sourceRevisionNumber} · {comparisonEvidenceId(ruleVariantCommitIssue.sourceRevisionId)}</dd></div>
            <div><dt>调用前 latest</dt><dd>{comparisonEvidenceId(ruleVariantCommitIssue.preCallLatestRevisionId)}</dd></div>
            <div><dt>调用前修订数</dt><dd>{ruleVariantCommitIssue.preCallRevisionCount}</dd></div>
            <div><dt>请求换日</dt><dd>{ruleVariantCommitIssue.requestedBoundary}</dd></div>
            <div><dt>源结果摘要</dt><dd>{shortHash(ruleVariantCommitIssue.sourceResultHash)}</dd></div>
            <div><dt>预期规则摘要</dt><dd>{shortHash(ruleVariantCommitIssue.expectedRuleProfileDigest)}</dd></div>
            <div><dt>预期结果摘要</dt><dd>{shortHash(ruleVariantCommitIssue.expectedResultHash)}</dd></div>
            {ruleVariantCommitIssue.phase === "returned_unreconciled" ? (
              <>
                <div><dt>返回 Case</dt><dd>{comparisonEvidenceId(ruleVariantCommitIssue.returnedCaseId)}</dd></div>
                <div><dt>返回 latest Revision</dt><dd>{ruleVariantCommitIssue.returnedRevisionNumber === null ? "序号未确认" : `R${ruleVariantCommitIssue.returnedRevisionNumber}`} · {comparisonEvidenceId(ruleVariantCommitIssue.returnedLatestRevisionId)}</dd></div>
              </>
            ) : (
              <div data-wide="true"><dt>返回回执</dt><dd>未取得可信返回值，无法判定是否已经追加 Revision。</dd></div>
            )}
          </dl>
          <div className="comparison-rule-commit-actions">
            {ruleVariantCommitIssue.revisionHref ? <AppLink href={ruleVariantCommitIssue.revisionHref} className="primary-action">打开返回修订</AppLink> : null}
            <AppLink href="/cases" className="secondary-action">到案例库核对</AppLink>
          </div>
        </section>
      ) : null}
      {!allSlotsComplete && slots.length > 1 ? <div className="info-panel"><Columns3 aria-hidden="true" /><p>请先为每个对照位选择确切 Revision；不会用“最新修订”自动填补缺失来源。</p></div> : null}
      {projectionLoading ? <div className="center-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" />正在复核修订摘要、来源绑定并同步计算运限</div> : null}

      {projection && comparisonDisplay && canCompare && sessionAccepted ? (
        <div className="formal-comparison-workspace">
          <section className={`comparison-summary${comparisonDisplay.differenceCount ? " has-differences" : " is-identical"}`} aria-labelledby="comparison-summary-title">
            <div>
              <p className="eyebrow">Difference index</p>
              <h2 id="comparison-summary-title">{differenceScope.kind === "active_pair"
                ? `A ↔ ${slotLabel(displayActiveCompareIndex)}：${comparisonDisplay.differenceCount} 个字段不同`
                : `${comparisonDisplay.differenceCount} 个字段存在差异`}</h2>
              <p>{comparisonDisplay.sameBirthInput
                ? differenceScope.kind === "active_pair"
                  ? `当前 A 与 ${slotLabel(displayActiveCompareIndex)} 的出生输入一致；规则或计算事实差异仍需分别审阅。`
                  : "全部盘的出生输入一致；规则或计算事实差异仍需分别审阅，不能自动推断因果。"
                : differenceScope.kind === "active_pair"
                  ? `当前 A 与 ${slotLabel(displayActiveCompareIndex)} 的出生输入不同；输入差异与规则差异必须分开阅读。`
                  : "本会话包含不同出生输入；输入差异与规则差异必须分开阅读。"}</p>
            </div>
            <StatusPill tone="info">{projection.matrix.items.length} 盘 · A 基准</StatusPill>
            <div className="comparison-reading-boundary" role="note" aria-label="正式对照解读边界">
              <span aria-hidden="true">≠</span>
              <div>
                <strong>静态字段差异，不是变化轨迹</strong>
                <p>这里并列确切 Revision 在同一字段上的值与可用状态。计数不表示改善、恶化、吉凶、相合、因果、关系强度或专家结论。</p>
              </div>
            </div>
            <nav className="comparison-difference-index" aria-label="跳到差异分组">
              {comparisonDisplay.sections
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
            <label className="comparison-difference-toggle"><input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />{differenceScope.kind === "active_pair"
              ? `只看当前 A–${slotLabel(displayActiveCompareIndex)} 存在差异的字段`
              : "只看任一比较盘相对 A 存在差异的字段"}</label>
          </section>

          {projection.matrix.items.length > 1 ? (
            <div className="comparison-mobile-switcher" data-difference-state={comparisonDisplay.differenceCount ? "changed" : "same"} role="group" aria-label="选择当前比较盘">
              <span className="comparison-mobile-identity">
                <strong aria-live="polite" aria-atomic="true">A · {comparisonCaseAlias(projection.matrix.items[0].caseAlias)} · R{projection.matrix.items[0].revision.revisionNumber} ↔ 当前 {slotLabel(displayActiveCompareIndex)} · {comparisonCaseAlias(projection.matrix.items[displayActiveCompareIndex].caseAlias)} · R{projection.matrix.items[displayActiveCompareIndex].revision.revisionNumber}</strong>
                <small>A {comparisonRuleProfileIdentity(projection.matrix.items[0].revision)} · {slotLabel(displayActiveCompareIndex)} {comparisonRuleProfileIdentity(projection.matrix.items[displayActiveCompareIndex].revision)}</small>
                <span className="comparison-mobile-research-links">
                  {[0, displayActiveCompareIndex].map((index) => {
                    const item = projection.matrix.items[index];
                    const label = slotLabel(index);
                    return (
                      <AppLink
                        key={item.key}
                        className="text-link comparison-revision-link"
                        href={revisionResearchHref(item.caseId, item.revision.id)}
                        aria-label={`从当前身份区研读 ${label}：${comparisonCaseAlias(item.caseAlias)} · Revision ${item.revision.revisionNumber}`}
                      >
                        研读 {label}
                      </AppLink>
                    );
                  })}
                </span>
              </span>
              <StatusPill tone={comparisonDisplay.differenceCount ? "info" : "neutral"}>{comparisonDisplay.differenceCount} 个差异</StatusPill>
              {projection.matrix.items.length > 2 ? projection.matrix.items.slice(1).map((item, offset) => {
                const index = offset + 1;
                return <button type="button" key={item.key} className={displayActiveCompareIndex === index ? "is-active" : ""} aria-label={`切换到比较盘 ${slotLabel(index)}：${comparisonCaseAlias(item.caseAlias)} · Revision ${item.revision.revisionNumber}`} aria-pressed={displayActiveCompareIndex === index} onClick={() => setActiveCompareIndex(index)}>{slotLabel(index)} · {comparisonCaseAlias(item.caseAlias)}</button>;
              }) : null}
            </div>
          ) : null}

          <ComparisonMatrixTable projection={projection} activeCompareIndex={displayActiveCompareIndex} differencesOnly={differencesOnly} differenceScope={differenceScope} display={comparisonDisplay} />

          <section className="comparison-transit-section" aria-labelledby="comparison-transit-title">
            <header className="section-heading-row">
              <div><p className="eyebrow">Synchronized transit</p><h2 id="comparison-transit-title">同一 UTC 瞬时点 · 六层并行</h2></div>
              <StatusPill tone="warning">工程预览</StatusPill>
            </header>
            <p className="comparison-transit-intro">同一请求瞬时点只用于各 Revision 独立回放民用时与运限节点；并列结果不构成跨盘关系、吉凶判断、因果解释或术数专家结论。</p>
            <form className="comparison-transit-form" data-state={transitDirty ? "draft" : "committed"} data-route-binding={routeBindingState} onSubmit={commitTransit}>
              <label className="field"><span>目标瞬时点（UTC）</span><input id="formal-comparison-transit-input" name="formalComparisonTransitUtc" type="datetime-local" step="60" required aria-describedby="formal-comparison-transit-help" value={transitInput} onChange={(event) => setTransitInput(event.target.value)} /><small id="formal-comparison-transit-help">此输入明确按 UTC 解释，不按浏览器本地时区解释。</small></label>
              <button type="submit" className="secondary-action" disabled={!transitDirty || projectionLoading || sessionLocked}><Clock3 aria-hidden="true" />{transitDirty ? "应用并重新计算" : "已同步当前 UTC"}</button>
              <div className="comparison-transit-commit-state"><StatusPill tone={transitDirty ? "warning" : routeSyncError ? "cinnabar" : routeBound ? "info" : "warning"}>{transitDirty ? "草稿" : routeSyncError ? "链接未绑定" : routeBound ? "已应用" : "链接核对中"}</StatusPill><span>{transitDirty ? "输入尚未应用；下方表格仍绑定已提交的 UTC 瞬时点。" : routeSyncError ? "输入与当前投影使用同一 UTC，但地址栏未通过绑定核对。" : routeBound ? "输入、地址栏与当前投影使用同一 UTC 瞬时点。" : "输入与当前投影已一致；地址栏仍在等待规范 URL 核对。"}</span></div>
              <code aria-label="当前已提交的 UTC 瞬时点">{transitInstant}</code>
            </form>
            <TransitComparisonTable projection={projection} activeCompareIndex={displayActiveCompareIndex} />
          </section>

          <footer className="comparison-evidence-footer">
            <div><span>工程对照投影摘要</span><code>{comparisonEvidenceId(projection.manifest.resultHash)}</code><small>用于绑定当前投影内容，不等于术数专家审核、领域真值或公开发布授权。</small></div>
            <p>部分术数映射仍待顾问复核，当前没有运限专家金标。颜色只辅助定位静态差异，每个状态均保留文字标记。</p>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
