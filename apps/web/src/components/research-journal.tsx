import { Archive, Link2, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  type CitationRecord,
  type DstDisambiguationPolicy,
  type EventRecord,
  type EventTimeMigrationEndpoint,
  type EventTimeMigrationInterpretation,
  type EventTimeMigrationReceipt,
  type ResearchNoteAnchor,
  type ResearchNoteRecord,
  type RevisionRecord,
  type TransitNode
} from "@hakimi/contracts";
import { computeEventRecordDigest, researchRepository } from "@hakimi/storage";
import {
  classifyStoredTimeZoneDatabaseForReplay,
  verifyEventTimeContextWithBundledArtifact
} from "@hakimi/time-core";
import { buildKnowledgeSearch, knowledgeEventHref, knowledgeResearchNoteHref } from "../lib/knowledge-route";
import { buildEventResearchQuery } from "../lib/event-research-query";
import { getEventTimeReplayPresentation } from "../lib/event-time-replay-presentation";
import { buildResearchQuerySearch } from "../lib/research-query-route";
import { createResearchQueryDraft } from "../lib/research-query-session";
import { AppLink, navigate } from "../lib/router";
import { buildChartSearch } from "../lib/transit-route";
import {
  EventTimeMigrationDeriveError,
  EventTimeMigrationPanel,
  EventTimeMigrationRelations,
  MinuteBoundaryPreview,
  minuteBoundaryCanSave,
  previewCivilMinute,
  type ReconcileEventTimeMigrationResult,
  type EventTimeMigrationResult,
  type MinutePreviewState
} from "./event-time-migration-panel";
import {
  acquireResearchJournalMutation,
  getResearchJournalMutationSnapshot,
  isCurrentResearchJournalMutation,
  lockResearchJournalMutationUnknown,
  releaseResearchJournalMutation,
  subscribeResearchJournalMutation,
  type JournalMutation,
  type JournalMutationClues,
  type JournalMutationIssuePhase,
  type JournalMutationKind
} from "./research-journal-mutation-coordinator";
import type { MatrixSelection } from "./four-pillars-matrix";
import { SingleChartReportExport } from "./single-chart-report-export";
import { StatusPill } from "./status-pill";
import "./research-journal-operations.css";

type NoteAnchorMode = "field" | "revision" | "case";
type Citation = CitationRecord;
type EventLifecycleFilter = "all" | "active" | "deleted";
type EventFeedbackFilter = "all" | EventRecord["feedback"];
type EventBindingFilter = "all" | "current_revision" | "current_node" | "unbound";

type JournalIndexState =
  | { requestCaseId: string; status: "loading"; message: null }
  | { requestCaseId: string; status: "loaded"; message: null }
  | { requestCaseId: string; status: "error"; message: string };

function loadingJournalIndexState(requestCaseId: string): JournalIndexState {
  return { requestCaseId, status: "loading", message: null };
}

const JOURNAL_MUTATION_LABELS: Record<JournalMutationKind, string> = {
  "note-save": "正在保存研究笔记并刷新本地索引…",
  "note-lifecycle": "正在更新研究笔记状态…",
  "event-save": "正在保存事件并刷新本地索引…",
  "event-lifecycle": "正在更新事件生命周期…",
  "event-time-migration": "正在派生并列事件时间解释与迁移凭证…"
};

type EventDraft = {
  title: string;
  datePrecision: EventRecord["datePrecision"];
  startDate: string;
  endDate: string;
  tags: string;
  sourceRefs: string;
  feedback: EventRecord["feedback"];
  body: string;
  timeZone: string;
  startDisambiguation: DstDisambiguationPolicy;
  endDisambiguation: DstDisambiguationPolicy;
};

const emptyEventDraft: EventDraft = {
  title: "",
  datePrecision: "day",
  startDate: "",
  endDate: "",
  tags: "",
  sourceRefs: "",
  feedback: "unreviewed",
  body: "",
  timeZone: "Asia/Shanghai",
  startDisambiguation: "reject",
  endDisambiguation: "reject"
};

const JOURNAL_INITIAL_RENDER_LIMIT = 24;
const JOURNAL_RENDER_STEP = 24;
const JOURNAL_TITLE_MAX_LENGTH = 240;
const JOURNAL_BODY_MAX_LENGTH = 20_000;
const JOURNAL_LIST_INPUT_MAX_LENGTH = 4_000;

const unsafeJournalTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu;

function safeJournalText(value: unknown, fallback: string, maxCodePoints = 480): string {
  if (typeof value !== "string") return fallback;
  const safeMaxCodePoints = Math.max(1, Math.min(maxCodePoints, 2_000));
  const normalized = value
    .slice(0, Math.max(safeMaxCodePoints * 8, 4_096))
    .replace(unsafeJournalTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return Array.from(normalized).slice(0, safeMaxCodePoints).join("") || fallback;
}

function journalErrorMessage(reason: unknown, fallback: string): string {
  try {
    return safeJournalText(reason instanceof Error ? reason.message : "", fallback);
  } catch {
    return fallback;
  }
}

function splitList(value: string): string[] {
  return value.split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function noteAnchorLabel(note: ResearchNoteRecord): string {
  if (note.anchor.kind === "case") return "整个案例";
  if (note.anchor.kind === "revision") return `修订 ${note.anchor.revisionId.slice(0, 8)}`;
  return `${note.anchor.pillar}.${note.anchor.field} · ${note.anchor.revisionId.slice(0, 8)}`;
}

function eventInputType(precision: EventRecord["datePrecision"]): "text" | "month" | "date" | "datetime-local" {
  if (precision === "month") return "month";
  if (precision === "day") return "date";
  if (precision === "minute") return "datetime-local";
  return "text";
}

function selectedPreviewInstant(
  preview: MinutePreviewState,
  policy: DstDisambiguationPolicy
): string | null {
  if (preview.status !== "ready" || preview.value.kind === "gap") return null;
  if (preview.value.kind === "unique") return preview.value.candidates[0]?.instant ?? null;
  return preview.value.candidates.find((candidate) => candidate.choice === policy)?.instant ?? null;
}

function eventTransitHref(caseId: string, record: EventRecord): string | null {
  const ref = record.transitNodeRef;
  if (!ref || !record.revisionId || ref.namespace !== "hakimi-transit-node") return null;
  return `/cases/${caseId}/revisions/${record.revisionId}${buildChartSearch("transit", {
    atInstant: ref.startInstant,
    selection: { nodeType: ref.nodeType, nodeId: ref.nodeId },
    manualDirection: ref.manualDirection
  })}`;
}

function eventMigrationEndpointHref(endpoint: EventTimeMigrationEndpoint): string {
  const { snapshot } = endpoint;
  if (snapshot.revisionId) {
    return `/cases/${snapshot.caseId}/revisions/${snapshot.revisionId}${buildChartSearch("research", undefined, {
      eventId: endpoint.recordId
    })}`;
  }
  return `/candidate-sets/${snapshot.caseId}?event=${endpoint.recordId}`;
}

function EventTimeContextSummary({ record }: { record: EventRecord }) {
  const replayBindingKey = `${record.id}:${record.updatedAt}:${record.timeContext.kind}`;
  const [replayState, setReplayState] = useState<{
    bindingKey: string;
    result: "idle" | "checking" | "passed" | "failed";
    message: string | null;
  }>(() => ({ bindingKey: replayBindingKey, result: "idle", message: null }));
  const replayRequestPendingRef = useRef(false);
  const replayRequestTokenRef = useRef(0);
  const activeReplayBindingKeyRef = useRef<string | null>(replayBindingKey);
  const replayResult = replayState.bindingKey === replayBindingKey ? replayState.result : "idle";
  const replayMessage = replayState.bindingKey === replayBindingKey ? replayState.message : null;

  useLayoutEffect(() => {
    activeReplayBindingKeyRef.current = replayBindingKey;
    replayRequestTokenRef.current += 1;
    replayRequestPendingRef.current = false;
    setReplayState({ bindingKey: replayBindingKey, result: "idle", message: null });
    return () => {
      if (activeReplayBindingKeyRef.current !== replayBindingKey) return;
      activeReplayBindingKeyRef.current = null;
      replayRequestTokenRef.current += 1;
      replayRequestPendingRef.current = false;
    };
  }, [replayBindingKey]);

  if (record.timeContext.kind === "legacy_floating") {
    return <p className="event-time-record event-time-record--legacy"><StatusPill tone="warning">旧版悬空时间</StatusPill><span>未推断 IANA 时区、UTC 偏移或标准 UTC</span></p>;
  }
  if (record.timeContext.kind === "calendar_date") {
    return <p className="event-time-record event-time-record--calendar"><StatusPill tone="info">日历日期</StatusPill><span>当前精度不适用 IANA 时区、DST、UTC 偏移或标准 UTC</span></p>;
  }
  const timeContext = record.timeContext;
  const start = timeContext.start;
  const end = timeContext.end;
  const replayStatus = classifyStoredTimeZoneDatabaseForReplay(timeContext);
  const replayPresentation = getEventTimeReplayPresentation(replayStatus);
  const verifyOriginalArtifact = async () => {
    if (replayRequestPendingRef.current || replayResult === "checking") return;
    const requestToken = replayRequestTokenRef.current + 1;
    replayRequestTokenRef.current = requestToken;
    const requestBindingKey = replayBindingKey;
    replayRequestPendingRef.current = true;
    setReplayState({ bindingKey: requestBindingKey, result: "checking", message: null });
    try {
      await verifyEventTimeContextWithBundledArtifact({
        datePrecision: record.datePrecision,
        startDate: record.startDate,
        endDate: record.endDate,
        timeContext
      });
      if (
        replayRequestTokenRef.current !== requestToken
        || activeReplayBindingKeyRef.current !== requestBindingKey
      ) return;
      setReplayState({
        bindingKey: requestBindingKey,
        result: "passed",
        message: `已按 IANA ${timeContext.timeZoneDatabase?.ianaVersion ?? "未知"} 原工件复核，冻结 UTC 与 DST 候选一致。`
      });
    } catch (reason) {
      if (
        replayRequestTokenRef.current !== requestToken
        || activeReplayBindingKeyRef.current !== requestBindingKey
      ) return;
      setReplayState({
        bindingKey: requestBindingKey,
        result: "failed",
        message: journalErrorMessage(reason, "历史时区复核失败；记录未被改写。")
      });
    } finally {
      if (
        replayRequestTokenRef.current === requestToken
        && activeReplayBindingKeyRef.current === requestBindingKey
      ) replayRequestPendingRef.current = false;
    }
  };
  return (
    <div className="event-time-record">
      <strong>{timeContext.timeZone}</strong>
      <span>{timeContext.timeZoneDatabase ? `IANA ${timeContext.timeZoneDatabase.ianaVersion} 固定快照` : "旧版浏览器 Intl · 具体 tzdb 未识别"}</span>
      <span>起始 {start.resolution.selectedCandidate.utcOffset} · UTC {start.canonicalUtc}{start.resolution.kind === "overlap" ? ` · ${start.resolution.selectedCandidate.choice}` : ""}</span>
      {end ? <span>结束 {end.resolution.selectedCandidate.utcOffset} · UTC {end.canonicalUtc}{end.resolution.kind === "overlap" ? ` · ${end.resolution.selectedCandidate.choice}` : ""}</span> : null}
      <span>
        <StatusPill tone={replayPresentation.tone}>
          {replayPresentation.label}
        </StatusPill>
      </span>
      {replayPresentation.boundary ? (
        <span className="event-time-replay-boundary">{replayPresentation.boundary}</span>
      ) : null}
      {replayStatus === "retained_exact" ? (
        <button type="button" className="text-button" disabled={replayResult === "checking"} aria-busy={replayResult === "checking"} onClick={() => void verifyOriginalArtifact()}>
          {replayResult === "checking" ? "正在按原工件复核…" : `按 IANA ${timeContext.timeZoneDatabase?.ianaVersion} 原工件复核`}
        </button>
      ) : null}
      {replayMessage ? (
        <span
          role={replayResult === "failed" ? "alert" : "status"}
          aria-atomic="true"
          className={replayResult === "failed" ? "inline-error" : undefined}
        >
          {replayMessage}
        </span>
      ) : null}
    </div>
  );
}

type ResearchJournalProps = {
  caseId: string;
  defaultTimeZone?: string;
  selectedEventId?: string | null;
  selectedEventError?: string | null;
  selectedEventErrorAnnouncedByParent?: boolean;
  onSelectEvent?: (eventId: string, options?: { replace?: boolean }) => void;
} & (
  | { revision: RevisionRecord; selection: MatrixSelection; transitNode?: TransitNode | null }
  | { revision: null; selection?: null; transitNode?: null }
);

export function ResearchJournal({
  caseId,
  revision,
  selection,
  transitNode = null,
  defaultTimeZone,
  selectedEventId = null,
  selectedEventError = null,
  selectedEventErrorAnnouncedByParent = false,
  onSelectEvent
}: ResearchJournalProps) {
  const journalMutationIssueTitleId = useId();
  const noteSectionTitleId = useId();
  const eventSectionTitleId = useId();
  const journalMutationSnapshot = useSyncExternalStore(
    subscribeResearchJournalMutation,
    getResearchJournalMutationSnapshot,
    getResearchJournalMutationSnapshot
  );
  const journalMutation = journalMutationSnapshot.status === "writing"
    ? journalMutationSnapshot.operation
    : null;
  const journalMutationIssue = journalMutationSnapshot.status === "call_unknown"
    ? journalMutationSnapshot.issue
    : null;
  const [notes, setNotes] = useState<ResearchNoteRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [eventTimeMigrationReceipts, setEventTimeMigrationReceipts] = useState<EventTimeMigrationReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCaseId, setLoadedCaseId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [citationIndex, setCitationIndex] = useState<JournalIndexState>(() => loadingJournalIndexState(caseId));
  const [receiptIndex, setReceiptIndex] = useState<JournalIndexState>(() => loadingJournalIndexState(caseId));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [noteAnchorMode, setNoteAnchorMode] = useState<NoteAnchorMode>(() => revision ? "field" : "case");
  const [noteBody, setNoteBody] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteSources, setNoteSources] = useState("");
  const [editingNote, setEditingNote] = useState<ResearchNoteRecord | null>(null);

  const subjectTimeZone = defaultTimeZone ?? revision?.input.timeZone ?? "Asia/Shanghai";
  const [eventDraft, setEventDraft] = useState<EventDraft>(() => ({ ...emptyEventDraft, timeZone: subjectTimeZone }));
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [bindSelectedNode, setBindSelectedNode] = useState(Boolean(revision && transitNode));
  const [eventKeyword, setEventKeyword] = useState("");
  const deferredEventKeyword = useDeferredValue(eventKeyword);
  const [eventLifecycle, setEventLifecycle] = useState<EventLifecycleFilter>("active");
  const [eventFeedback, setEventFeedback] = useState<EventFeedbackFilter>("all");
  const [eventBinding, setEventBinding] = useState<EventBindingFilter>("all");
  const [eventTag, setEventTag] = useState("all");
  const [migratingEventId, setMigratingEventId] = useState<string | null>(null);
  const [pendingNoteFocusId, setPendingNoteFocusId] = useState<string | null>(null);
  const [pendingEventFocusId, setPendingEventFocusId] = useState<string | null>(null);
  const [noteRenderLimit, setNoteRenderLimit] = useState(JOURNAL_INITIAL_RENDER_LIMIT);
  const [eventRenderLimit, setEventRenderLimit] = useState(JOURNAL_INITIAL_RENDER_LIMIT);
  const noteEditButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const eventCardRefs = useRef(new Map<string, HTMLElement>());
  const eventEditButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const eventMigrationButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastDeepLinkedEventFocusKeyRef = useRef<string | null>(null);
  const noteBodyInputRef = useRef<HTMLTextAreaElement>(null);
  const eventTitleInputRef = useRef<HTMLInputElement>(null);
  const eventLifecycleFilterRef = useRef<HTMLSelectElement>(null);
  const snapshotRequestVersionRef = useRef(0);
  const snapshotAbortControllerRef = useRef<AbortController | null>(null);
  const previousCaseIdRef = useRef(caseId);
  const currentCaseIdRef = useRef(caseId);
  const componentMountedRef = useRef(true);
  currentCaseIdRef.current = caseId;

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      snapshotRequestVersionRef.current += 1;
      snapshotAbortControllerRef.current?.abort();
      snapshotAbortControllerRef.current = null;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!componentMountedRef.current) return;
    snapshotAbortControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotAbortControllerRef.current = controller;
    const requestVersion = snapshotRequestVersionRef.current + 1;
    snapshotRequestVersionRef.current = requestVersion;
    setLoading(true);
    setLoadError(null);
    setError(null);
    setCitationIndex(loadingJournalIndexState(caseId));
    setReceiptIndex(loadingJournalIndexState(caseId));
    setCitations([]);
    setEventTimeMigrationReceipts([]);
    try {
      const snapshot = await researchRepository.readResearchJournalSnapshot(caseId, {
        signal: controller.signal
      });
      if (
        controller.signal.aborted
        || requestVersion !== snapshotRequestVersionRef.current
        || snapshot.caseId !== caseId
      ) return;
      setNotes([...snapshot.notes]);
      setEvents([...snapshot.events]);
      setLoadedCaseId(snapshot.caseId);
      if (snapshot.citationIndex.status === "loaded") {
        setCitations([...snapshot.citationIndex.records]);
        setCitationIndex({ requestCaseId: snapshot.caseId, status: "loaded", message: null });
      } else {
        setCitationIndex({
          requestCaseId: snapshot.caseId,
          status: "error",
          message: snapshot.citationIndex.message
        });
      }
      if (snapshot.receiptIndex.status === "loaded") {
        setEventTimeMigrationReceipts([...snapshot.receiptIndex.records]);
        setReceiptIndex({ requestCaseId: snapshot.caseId, status: "loaded", message: null });
      } else {
        setReceiptIndex({
          requestCaseId: snapshot.caseId,
          status: "error",
          message: snapshot.receiptIndex.message
        });
      }
    } catch (reason) {
      if (controller.signal.aborted || requestVersion !== snapshotRequestVersionRef.current) return;
      setNotes([]);
      setEvents([]);
      setLoadedCaseId(caseId);
      setLoadError(journalErrorMessage(reason, "无法读取研究资料。"));
      setCitationIndex({ requestCaseId: caseId, status: "error", message: "核心原子快照未形成。" });
      setReceiptIndex({ requestCaseId: caseId, status: "error", message: "核心原子快照未形成。" });
    } finally {
      if (snapshotAbortControllerRef.current === controller) snapshotAbortControllerRef.current = null;
      if (!controller.signal.aborted && requestVersion === snapshotRequestVersionRef.current) setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
    return () => {
      snapshotRequestVersionRef.current += 1;
      snapshotAbortControllerRef.current?.abort();
      snapshotAbortControllerRef.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    if (previousCaseIdRef.current === caseId) return;
    previousCaseIdRef.current = caseId;
    setNoteAnchorMode(revision ? "field" : "case");
    setNoteBody("");
    setNoteTags("");
    setNoteSources("");
    setEditingNote(null);
    setEventDraft({ ...emptyEventDraft, timeZone: subjectTimeZone });
    setEditingEvent(null);
    setBindSelectedNode(Boolean(revision && transitNode));
    setEventKeyword("");
    setEventLifecycle("active");
    setEventFeedback("all");
    setEventBinding("all");
    setEventTag("all");
    setNoteRenderLimit(JOURNAL_INITIAL_RENDER_LIMIT);
    setEventRenderLimit(JOURNAL_INITIAL_RENDER_LIMIT);
    setMigratingEventId(null);
    setPendingNoteFocusId(null);
    setPendingEventFocusId(null);
    setError(null);
    setMessage(null);
    lastDeepLinkedEventFocusKeyRef.current = null;
  }, [caseId, revision, subjectTimeZone, transitNode]);

  useEffect(() => {
    setEventRenderLimit(JOURNAL_INITIAL_RENDER_LIMIT);
  }, [deferredEventKeyword, eventBinding, eventFeedback, eventLifecycle, eventTag]);

  useEffect(() => {
    setBindSelectedNode(Boolean(revision && transitNode));
    if (!revision) setNoteAnchorMode("case");
  }, [revision, transitNode?.ref.nodeId]);

  useEffect(() => {
    if (!editingEvent) {
      setEventDraft((current) => ({ ...current, timeZone: subjectTimeZone }));
    }
  }, [editingEvent, subjectTimeZone]);

  const eventTags = useMemo(
    () => Array.from(new Set(events.flatMap((record) => record.tags))).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [events]
  );

  const citationsByTarget = useMemo(() => {
    const researchNotes = new Map<string, Citation[]>();
    const events = new Map<string, Citation[]>();
    for (const citation of citations) {
      const researchNoteIds = new Set<string>();
      const eventIds = new Set<string>();
      for (const target of citation.targets) {
        if (target.kind === "research_note") researchNoteIds.add(target.noteId);
        if (target.kind === "event") eventIds.add(target.eventId);
      }
      for (const noteId of researchNoteIds) {
        const group = researchNotes.get(noteId);
        if (group) group.push(citation);
        else researchNotes.set(noteId, [citation]);
      }
      for (const eventId of eventIds) {
        const group = events.get(eventId);
        if (group) group.push(citation);
        else events.set(eventId, [citation]);
      }
    }
    return { researchNotes, events };
  }, [citations]);

  const eventTimeReceiptsByEventId = useMemo(() => {
    const grouped = new Map<string, EventTimeMigrationReceipt[]>();
    for (const receipt of eventTimeMigrationReceipts) {
      for (const eventId of [receipt.source.recordId, receipt.target.recordId]) {
        const current = grouped.get(eventId);
        if (current) current.push(receipt);
        else grouped.set(eventId, [receipt]);
      }
    }
    return grouped;
  }, [eventTimeMigrationReceipts]);

  const filteredEvents = useMemo(() => {
    const keyword = deferredEventKeyword.trim().toLocaleLowerCase("zh-CN");
    return events.filter((record) => {
      if (eventLifecycle === "active" && record.deletedAt) return false;
      if (eventLifecycle === "deleted" && !record.deletedAt) return false;
      if (eventFeedback !== "all" && record.feedback !== eventFeedback) return false;
      if (eventTag !== "all" && !record.tags.includes(eventTag)) return false;
      if (eventBinding === "current_revision" && (!revision || record.revisionId !== revision.id)) return false;
      if (eventBinding === "current_node") {
        if (
          !revision ||
          !transitNode ||
          record.revisionId !== revision.id ||
          record.transitNodeRef?.namespace !== "hakimi-transit-node" ||
          record.transitNodeRef.revisionId !== revision.id ||
          record.transitNodeRef.nodeId !== transitNode.ref.nodeId
        ) return false;
      }
      if (eventBinding === "unbound" && (record.revisionId !== null || record.transitNodeRef !== null)) return false;
      if (!keyword) return true;
      return [record.title, record.body, ...record.tags, ...record.sourceRefs]
        .some((value) => value.toLocaleLowerCase("zh-CN").includes(keyword));
    });
  }, [deferredEventKeyword, eventBinding, eventFeedback, eventLifecycle, eventTag, events, revision, transitNode]);

  const selectedEvent = useMemo(
    () => selectedEventId ? events.find((record) => record.id === selectedEventId) ?? null : null,
    [events, selectedEventId]
  );
  const selectedEventResolvedId = selectedEvent?.id ?? null;
  const selectedEventFocusKey = selectedEventResolvedId
    ? `${caseId}\u0000${revision?.id ?? ""}\u0000${selectedEventResolvedId}`
    : null;
  const selectedEventIsPinned = Boolean(selectedEvent && !filteredEvents.some((record) => record.id === selectedEvent.id));
  const visibleEvents = useMemo(
    () => selectedEvent && !filteredEvents.some((record) => record.id === selectedEvent.id)
      ? [selectedEvent, ...filteredEvents]
      : filteredEvents,
    [filteredEvents, selectedEvent]
  );

  const focusEventCard = useCallback((eventId: string) => {
    const card = eventCardRefs.current.get(eventId);
    if (!card) return false;
    const reducedMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.focus({ preventScroll: true });
    card.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    return true;
  }, []);

  useEffect(() => {
    if (!selectedEventFocusKey) {
      lastDeepLinkedEventFocusKeyRef.current = null;
      return;
    }
    if (loading || migratingEventId !== null || lastDeepLinkedEventFocusKeyRef.current === selectedEventFocusKey) return;
    if (focusEventCard(selectedEventResolvedId!)) {
      lastDeepLinkedEventFocusKeyRef.current = selectedEventFocusKey;
    }
  }, [focusEventCard, loading, migratingEventId, selectedEventFocusKey, selectedEventResolvedId]);

  useEffect(() => {
    if (!pendingEventFocusId || !events.some((record) => record.id === pendingEventFocusId)) return;
    const frame = window.requestAnimationFrame(() => {
      if (focusEventCard(pendingEventFocusId)) setPendingEventFocusId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [events, focusEventCard, pendingEventFocusId]);

  useEffect(() => {
    if (!pendingNoteFocusId || !notes.some((record) => record.id === pendingNoteFocusId)) return;
    const frame = window.requestAnimationFrame(() => {
      const editButton = noteEditButtonRefs.current.get(pendingNoteFocusId);
      if (!editButton) return;
      editButton.focus();
      setPendingNoteFocusId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [notes, pendingNoteFocusId]);

  useEffect(() => {
    if (!editingNote) return;
    const frame = window.requestAnimationFrame(() => {
      noteBodyInputRef.current?.focus();
      noteBodyInputRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingNote?.id]);

  useEffect(() => {
    if (!editingEvent) return;
    const frame = window.requestAnimationFrame(() => {
      eventTitleInputRef.current?.focus();
      eventTitleInputRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingEvent?.id]);

  const startMinutePreview = useMemo(
    () => eventDraft.datePrecision === "minute"
      ? previewCivilMinute(eventDraft.startDate, eventDraft.timeZone)
      : { status: "empty" } as MinutePreviewState,
    [eventDraft.datePrecision, eventDraft.startDate, eventDraft.timeZone]
  );
  const endMinutePreview = useMemo(
    () => eventDraft.datePrecision === "minute" && eventDraft.endDate
      ? previewCivilMinute(eventDraft.endDate, eventDraft.timeZone)
      : { status: "empty" } as MinutePreviewState,
    [eventDraft.datePrecision, eventDraft.endDate, eventDraft.timeZone]
  );
  const editingLegacyEvent = editingEvent?.timeContext.kind === "legacy_floating";
  const minuteTimeCanSave = editingLegacyEvent || eventDraft.datePrecision !== "minute" || (
    eventDraft.timeZone.trim().length > 0 &&
    minuteBoundaryCanSave(startMinutePreview, eventDraft.startDisambiguation, true) &&
    minuteBoundaryCanSave(endMinutePreview, eventDraft.endDisambiguation, Boolean(eventDraft.endDate))
  );
  const startMinuteInstant = selectedPreviewInstant(startMinutePreview, eventDraft.startDisambiguation);
  const endMinuteInstant = selectedPreviewInstant(endMinutePreview, eventDraft.endDisambiguation);
  const eventRangeInvalid = !editingLegacyEvent
    && Boolean(eventDraft.startDate && eventDraft.endDate)
    && (eventDraft.datePrecision === "minute"
      ? Boolean(startMinuteInstant && endMinuteInstant && endMinuteInstant < startMinuteInstant)
      : eventDraft.endDate < eventDraft.startDate);
  const eventTimeCanSave = minuteTimeCanSave && !eventRangeInvalid;

  const beginJournalMutation = (kind: JournalMutationKind): JournalMutation | null => {
    return acquireResearchJournalMutation(kind, caseId);
  };

  const journalMutationIsCurrent = (operation: JournalMutation): boolean =>
    isCurrentResearchJournalMutation(operation);

  const journalMutationTargetsVisibleCase = (operation: JournalMutation): boolean =>
    currentCaseIdRef.current === operation.requestedCaseId;

  const journalMutationCanUpdateCurrentInstance = (operation: JournalMutation): boolean =>
    componentMountedRef.current
    && journalMutationIsCurrent(operation)
    && journalMutationTargetsVisibleCase(operation);

  const finishJournalMutation = (operation: JournalMutation) => {
    releaseResearchJournalMutation(operation);
  };

  const lockUnknownJournalMutation = (
    operation: JournalMutation,
    clues: JournalMutationClues,
    reason: unknown,
    fallback: string,
    phase: JournalMutationIssuePhase = "call_unknown"
  ) => {
    const issue = lockResearchJournalMutationUnknown(
      operation,
      clues,
      `${journalErrorMessage(reason, fallback)} ${phase === "returned_unreconciled"
        ? "仓储调用已经返回，但页面没有取得可信的提交后绑定结果。"
        : "仓储调用已经开始，但页面没有取得可信返回值。"}`,
      phase
    );
    if (
      issue
      && componentMountedRef.current
      && currentCaseIdRef.current === operation.requestedCaseId
    ) {
      setError(null);
      setMessage(null);
      if (operation.kind === "event-time-migration") setMigratingEventId(null);
    }
  };

  const resetNoteEditor = () => {
    setEditingNote(null);
    setNoteBody("");
    setNoteTags("");
    setNoteSources("");
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!noteBody.trim()) {
      setError("研究笔记不能为空。");
      return;
    }
    const operation = beginJournalMutation("note-save");
    if (!operation) return;
    const editedNoteId = editingNote?.id ?? null;
    setError(null);
    setMessage(null);
    const noteTagsSnapshot = splitList(noteTags);
    const noteSourcesSnapshot = splitList(noteSources);
    const noteDraftIdentity = `正文 ${noteBody.length} 字符 · ${noteTagsSnapshot.length} 个标签 · ${noteSourcesSnapshot.length} 个来源引用`;
    let writeCallStarted = false;
    let mutationClues: JournalMutationClues | null = null;
    let successMessage: string;
    try {
      if (editingNote) {
        mutationClues = {
          targetKind: "research_note",
          targetId: editingNote.id,
          action: "更新研究笔记",
          expectedState: `调用前 editVersion ${editingNote.editVersion}`,
          draftIdentity: noteDraftIdentity
        };
        writeCallStarted = true;
        await researchRepository.updateResearchNote(editingNote.id, {
          expectedEditVersion: editingNote.editVersion,
          patch: { body: noteBody, tags: noteTagsSnapshot, sourceRefs: noteSourcesSnapshot }
        });
        writeCallStarted = false;
        if (!journalMutationCanUpdateCurrentInstance(operation)) return;
        successMessage = "研究笔记已生成新编辑版本。";
      } else {
        let anchor: ResearchNoteAnchor;
        if (!revision || noteAnchorMode === "case") {
          anchor = { kind: "case" };
        } else if (noteAnchorMode === "revision") {
          anchor = { kind: "revision", revisionId: revision.id };
        } else {
          anchor = {
            kind: "chart_field",
            revisionId: revision.id,
            pillar: selection.pillar,
            field: selection.field === "stem" || selection.field === "branch" ? "ganZhi" : selection.field
          };
        }
        mutationClues = {
          targetKind: "research_note",
          targetId: null,
          action: "创建研究笔记",
          expectedState: `新记录 · ${anchor.kind} 锚点`,
          draftIdentity: noteDraftIdentity
        };
        writeCallStarted = true;
        await researchRepository.createResearchNote({
          caseId,
          anchor,
          body: noteBody,
          tags: noteTagsSnapshot,
          sourceRefs: noteSourcesSnapshot,
          lifecycle: "active"
        });
        writeCallStarted = false;
        if (!journalMutationCanUpdateCurrentInstance(operation)) return;
        successMessage = revision ? "研究笔记已保存到本地案例。" : "案例级研究笔记已保存到候选组。";
      }
      resetNoteEditor();
      await refresh();
      if (journalMutationCanUpdateCurrentInstance(operation)) setMessage(successMessage);
      if (
        editedNoteId
        && journalMutationCanUpdateCurrentInstance(operation)
      ) setPendingNoteFocusId(editedNoteId);
    } catch (reason) {
      if (journalMutationIsCurrent(operation)) {
        if (writeCallStarted && mutationClues) {
          lockUnknownJournalMutation(operation, mutationClues, reason, "研究笔记仓储调用抛出未知错误。");
        } else if (journalMutationCanUpdateCurrentInstance(operation)) {
          setError(journalErrorMessage(reason, "研究笔记保存失败。"));
        }
      }
    } finally {
      finishJournalMutation(operation);
    }
  };

  const beginEditNote = (note: ResearchNoteRecord) => {
    setEditingNote(note);
    setNoteBody(note.body);
    setNoteTags(note.tags.join("、"));
    setNoteSources(note.sourceRefs.join("\n"));
    setError(null);
  };

  const cancelNoteEdit = () => {
    const noteId = editingNote?.id ?? null;
    resetNoteEditor();
    if (noteId) {
      window.requestAnimationFrame(() => noteEditButtonRefs.current.get(noteId)?.focus());
    }
  };

  const toggleNoteArchive = async (note: ResearchNoteRecord) => {
    const operation = beginJournalMutation("note-lifecycle");
    if (!operation) return;
    setError(null);
    let writeCallStarted = false;
    const mutationClues: JournalMutationClues = {
      targetKind: "research_note",
      targetId: note.id,
      action: note.lifecycle === "active" ? "归档研究笔记" : "恢复研究笔记",
      expectedState: `调用前 editVersion ${note.editVersion} · lifecycle ${note.lifecycle}`,
      draftIdentity: `${noteAnchorLabel(note)} · 正文 ${note.body.length} 字符`
    };
    try {
      writeCallStarted = true;
      await researchRepository.updateResearchNote(note.id, {
        expectedEditVersion: note.editVersion,
        patch: { lifecycle: note.lifecycle === "active" ? "archived" : "active" }
      });
      writeCallStarted = false;
      if (!journalMutationCanUpdateCurrentInstance(operation)) return;
      await refresh();
    } catch (reason) {
      if (journalMutationIsCurrent(operation)) {
        if (writeCallStarted) {
          lockUnknownJournalMutation(operation, mutationClues, reason, "研究笔记生命周期调用抛出未知错误。");
        } else if (journalMutationCanUpdateCurrentInstance(operation)) {
          setError(journalErrorMessage(reason, "无法更新笔记状态。"));
        }
      }
    } finally {
      finishJournalMutation(operation);
    }
  };

  const updateEventDraft = <Key extends keyof EventDraft>(key: Key, value: EventDraft[Key]) => {
    setEventDraft((current) => ({ ...current, [key]: value }));
  };

  const resetEventEditor = () => {
    setEditingEvent(null);
    setEventDraft({ ...emptyEventDraft, timeZone: subjectTimeZone });
  };

  const cancelEventEdit = () => {
    const eventId = editingEvent?.id ?? null;
    resetEventEditor();
    if (eventId) {
      window.requestAnimationFrame(() => eventEditButtonRefs.current.get(eventId)?.focus());
    }
  };

  const cancelEventTimeMigration = () => {
    const eventId = migratingEventId;
    setMigratingEventId(null);
    if (eventId) {
      window.requestAnimationFrame(() => eventMigrationButtonRefs.current.get(eventId)?.focus());
    }
  };

  const selectEventInRoute = (eventId: string): string | null => {
    try {
      onSelectEvent?.(eventId, { replace: true });
      return null;
    } catch (reason) {
      return journalErrorMessage(reason, "地址栏事件定位发生未知错误。");
    }
  };

  const beginEventTimeMigration = (record: EventRecord) => {
    if (getResearchJournalMutationSnapshot().status !== "idle") return;
    resetEventEditor();
    setMigratingEventId(record.id);
    setError(null);
    const selectionIssue = selectEventInRoute(record.id);
    if (selectionIssue) {
      setError(`时间迁移面板已打开，但地址栏没有完成事件定位：${selectionIssue}`);
    }
  };

  const registerEventTimeMigration = (result: EventTimeMigrationResult) => {
    setEvents((current) => {
      const byId = new Map(current.map((record) => [record.id, record]));
      byId.set(result.source.id, result.source);
      byId.set(result.target.id, result.target);
      return [...byId.values()].sort((left, right) => (
        right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
      ));
    });
    setEventTimeMigrationReceipts((current) => [
      result.receipt,
      ...current.filter((receipt) => receipt.id !== result.receipt.id)
    ]);
    setMessage("新事件和时间迁移凭证已保存；旧事件未改写。");
    void refresh();
  };

  const saveEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventDraft.title.trim()) {
      setError("事件标题不能为空。");
      eventTitleInputRef.current?.focus();
      return;
    }
    if (eventRangeInvalid) {
      setError("事件结束时间不能早于起始时间；当前记录没有保存。");
      return;
    }
    if (!minuteTimeCanSave) {
      setError("分钟级事件时间尚未完成精确解析；请处理时区、DST 重叠或空档后再保存。");
      return;
    }
    const operation = beginJournalMutation("event-save");
    if (!operation) return;
    setError(null);
    setMessage(null);
    let writeCallStarted = false;
    let mutationClues: JournalMutationClues | null = null;
    try {
      const dateValues = eventDraft.datePrecision === "unknown"
        ? { startDate: null, endDate: null }
        : { startDate: eventDraft.startDate || null, endDate: eventDraft.endDate || null };
      const timeWriteInput = eventDraft.datePrecision === "minute"
        ? {
            timeZone: eventDraft.timeZone.trim(),
            startDisambiguation: eventDraft.startDisambiguation,
            endDisambiguation: eventDraft.endDisambiguation
          }
        : {};
      const contentPayload = {
        title: eventDraft.title,
        tags: splitList(eventDraft.tags),
        sourceRefs: splitList(eventDraft.sourceRefs),
        feedback: eventDraft.feedback,
        body: eventDraft.body
      };
      const payload = {
        ...contentPayload,
        datePrecision: eventDraft.datePrecision,
        ...dateValues,
        ...timeWriteInput
      };
      let saved: EventRecord;
      let successMessage: string;
      if (editingEvent) {
        mutationClues = {
          targetKind: "event",
          targetId: editingEvent.id,
          action: "更新事件记录",
          expectedState: `调用前 updatedAt ${editingEvent.updatedAt} · ${editingEvent.deletedAt ? "已软删除" : "有效"}`,
          draftIdentity: `${eventDraft.title.trim()} · ${eventDraft.datePrecision} · ${dateValues.startDate ?? "无起始时间"}`
        };
        writeCallStarted = true;
        saved = await researchRepository.updateEvent(editingEvent.id, editingLegacyEvent ? contentPayload : payload);
        writeCallStarted = false;
        successMessage = "事件记录已更新。";
      } else {
        const bindsTransitNode = Boolean(revision && bindSelectedNode && transitNode);
        mutationClues = {
          targetKind: "event",
          targetId: null,
          action: "创建事件记录",
          expectedState: `新记录 · revision ${revision?.id ?? "null"} · transit ${bindsTransitNode ? transitNode?.ref.nodeId ?? "unknown" : "null"}`,
          draftIdentity: `${eventDraft.title.trim()} · ${eventDraft.datePrecision} · ${dateValues.startDate ?? "无起始时间"}`
        };
        writeCallStarted = true;
        saved = await researchRepository.createEvent({
          caseId,
          revisionId: revision?.id ?? null,
          transitNodeRef: bindsTransitNode && transitNode ? transitNode.ref : null,
          ...payload
        });
        writeCallStarted = false;
        successMessage = !revision
          ? "事件已链接到当前候选组；revisionId 保持 null。"
          : bindsTransitNode
            ? "事件已链接到当前案例、修订与运限节点。"
            : "事件已链接到当前案例与修订。";
      }
      if (!journalMutationCanUpdateCurrentInstance(operation)) return;
      setEvents((current) => {
        const byId = new Map(current.map((record) => [record.id, record]));
        byId.set(saved.id, saved);
        return [...byId.values()].sort((left, right) => (
          right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
        ));
      });
      resetEventEditor();
      await refresh();
      if (!journalMutationCanUpdateCurrentInstance(operation)) return;
      setMessage(successMessage);
      setPendingEventFocusId(saved.id);
      const selectionIssue = selectEventInRoute(saved.id);
      if (selectionIssue) {
        setMessage(`${successMessage} 地址栏没有完成新事件定位：${selectionIssue} 请重新读取事件列表后打开该事件。`);
      }
    } catch (reason) {
      if (journalMutationIsCurrent(operation)) {
        if (writeCallStarted && mutationClues) {
          lockUnknownJournalMutation(operation, mutationClues, reason, "事件仓储调用抛出未知错误。");
        } else if (journalMutationCanUpdateCurrentInstance(operation)) {
          setError(journalErrorMessage(reason, "事件保存失败。"));
          eventTitleInputRef.current?.focus();
        }
      }
    } finally {
      finishJournalMutation(operation);
    }
  };

  const beginEditEvent = (record: EventRecord) => {
    setMigratingEventId(null);
    setEditingEvent(record);
    setEventDraft({
      title: record.title,
      datePrecision: record.datePrecision,
      startDate: record.startDate ?? "",
      endDate: record.endDate ?? "",
      tags: record.tags.join("、"),
      sourceRefs: record.sourceRefs.join("\n"),
      feedback: record.feedback,
      body: record.body,
      timeZone: record.timeContext.kind === "zoned_minute" ? record.timeContext.timeZone : subjectTimeZone,
      startDisambiguation: record.timeContext.kind === "zoned_minute" ? record.timeContext.start.resolution.policy : "reject",
      endDisambiguation: record.timeContext.kind === "zoned_minute" ? record.timeContext.end?.resolution.policy ?? "reject" : "reject"
    });
    setError(null);
    const selectionIssue = selectEventInRoute(record.id);
    if (selectionIssue) {
      setError(`事件已载入编辑器，但地址栏没有完成事件定位：${selectionIssue}`);
    }
  };

  const startEventResearch = (record: EventRecord) => {
    setError(null);
    try {
      const draft = createResearchQueryDraft(buildEventResearchQuery(record));
      navigate(`/cases/research${buildResearchQuerySearch({
        source: "draft",
        referenceId: draft.id,
        resultKey: null
      })}`);
    } catch (reason) {
      setError(
        journalErrorMessage(reason, "无法从此事件建立研究查询草稿。")
      );
    }
  };

  const toggleEventDeleted = async (record: EventRecord) => {
    const operation = beginJournalMutation("event-lifecycle");
    if (!operation) return;
    setError(null);
    let writeCallStarted = false;
    const mutationClues: JournalMutationClues = {
      targetKind: "event",
      targetId: record.id,
      action: record.deletedAt ? "恢复事件" : "软删除事件",
      expectedState: `调用前 updatedAt ${record.updatedAt} · deletedAt ${record.deletedAt ?? "null"}`,
      draftIdentity: `${record.title} · ${record.datePrecision} · ${record.startDate ?? "无起始时间"}`
    };
    try {
      if (migratingEventId === record.id) setMigratingEventId(null);
      writeCallStarted = true;
      if (record.deletedAt) await researchRepository.restoreEvent(record.id);
      else await researchRepository.softDeleteEvent(record.id);
      writeCallStarted = false;
      if (!journalMutationCanUpdateCurrentInstance(operation)) return;
      await refresh();
      if (!journalMutationCanUpdateCurrentInstance(operation)) return;
      const hiddenByLifecycle = (!record.deletedAt && eventLifecycle === "active") || (Boolean(record.deletedAt) && eventLifecycle === "deleted");
      if (hiddenByLifecycle && selectedEventId !== record.id) {
        window.requestAnimationFrame(() => eventLifecycleFilterRef.current?.focus());
      } else {
        setPendingEventFocusId(record.id);
      }
    } catch (reason) {
      if (journalMutationIsCurrent(operation)) {
        if (writeCallStarted) {
          lockUnknownJournalMutation(operation, mutationClues, reason, "事件生命周期调用抛出未知错误。");
        } else if (journalMutationCanUpdateCurrentInstance(operation)) {
          setError(journalErrorMessage(reason, "无法更新事件状态。"));
        }
      }
    } finally {
      finishJournalMutation(operation);
    }
  };

  const dateInputType = eventInputType(eventDraft.datePrecision);
  const activeNoteCount = notes.reduce((count, note) => count + (note.lifecycle === "active" ? 1 : 0), 0);
  const activeEventCount = events.reduce((count, record) => count + (record.deletedAt ? 0 : 1), 0);
  const noteWorkspaceId = `research-notes-${caseId}`;
  const eventWorkspaceId = `research-events-${caseId}`;
  const renderedNotes = notes.slice(0, noteRenderLimit);
  const renderedEventPage = visibleEvents.slice(0, eventRenderLimit);
  const renderedEvents = selectedEvent && !renderedEventPage.some((record) => record.id === selectedEvent.id)
    ? [selectedEvent, ...renderedEventPage]
    : renderedEventPage;
  const journalContextMatches = loadedCaseId === caseId;
  const journalReady = journalContextMatches && loadError === null;
  const citationIndexMatches = citationIndex.requestCaseId === caseId;
  const receiptIndexMatches = receiptIndex.requestCaseId === caseId;
  const citationIndexReady = citationIndexMatches && citationIndex.status === "loaded";
  const receiptIndexReady = receiptIndexMatches && receiptIndex.status === "loaded";
  const citationIndexLoading = !citationIndexMatches || citationIndex.status === "loading";
  const receiptIndexLoading = !receiptIndexMatches || receiptIndex.status === "loading";
  const citationIndexError = citationIndexMatches && citationIndex.status === "error" ? citationIndex.message : null;
  const receiptIndexError = receiptIndexMatches && receiptIndex.status === "error" ? receiptIndex.message : null;
  const auxiliaryLoading = citationIndexLoading || receiptIndexLoading;
  const auxiliaryFailed = Boolean(citationIndexError || receiptIndexError);
  const journalMutationBusy = journalMutation !== null;
  const journalMutationActive = journalMutationBusy || journalMutationIssue !== null;
  const journalMutationOutsideCurrentCase = Boolean(
    journalMutation && journalMutation.requestedCaseId !== caseId
  );
  const journalMutationIssueOutsideCurrentCase = Boolean(
    journalMutationIssue && journalMutationIssue.requestedCaseId !== caseId
  );
  const noteSaving = journalMutation?.kind === "note-save";
  const eventSaving = journalMutation?.kind === "event-save";
  const eventFilterPending = eventKeyword !== deferredEventKeyword;
  const eventFilterActive = eventKeyword.trim().length > 0
    || eventLifecycle !== "active"
    || eventFeedback !== "all"
    || eventBinding !== "all"
    || eventTag !== "all";

  return (
    <div
      className="research-journal"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-formal-activation-allowed="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="repository-guarded"
      data-mutation-coordinator="page-runtime-shared"
      data-mutation-state={journalMutationIssue ? journalMutationIssue.phase : journalMutationBusy ? "writing" : "idle"}
      data-mutation-scope={journalMutationIssue
        ? journalMutationIssueOutsideCurrentCase ? "previous_case" : "current_case"
        : journalMutationBusy
          ? journalMutationOutsideCurrentCase ? "previous_case" : "current_case"
          : "none"}
      data-record-write-state={journalMutationIssue ? "unknown" : journalMutationBusy ? "in_progress" : "idle"}
      data-core-index-state={journalReady ? "loaded" : loadError ? "error" : "loading"}
      data-auxiliary-index-state={auxiliaryFailed ? "error" : auxiliaryLoading ? "loading" : "loaded"}
      data-expert-truth-claimed="false"
      data-public-release-authorized="false"
      aria-busy={loading || !journalContextMatches || auxiliaryLoading || journalMutationBusy}
    >
      {loading || !journalContextMatches ? <p className="research-loading" role="status" aria-atomic="true">{journalContextMatches ? "正在刷新研究资料；下方暂为上次读取快照…" : "正在读取当前研究对象的笔记与事件…"}</p> : null}
      {journalContextMatches && loadError ? (
        <div className="journal-index-gate" data-tone="error" role="alert">
          <div><strong>研究笔记与事件暂不可用</strong><p>{loadError} 当前案例没有被解释为空记录，写入入口保持关闭。</p></div>
          <button type="button" className="secondary-action" onClick={() => void refresh()}><RefreshCw aria-hidden="true" />重新读取研究资料</button>
        </div>
      ) : null}

      {journalReady ? <>
      {error ? <div className="inline-error" role="alert"><strong>研究资料操作未完成</strong><p>{error}</p></div> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {journalMutation ? <p className="journal-operation-status" role="status" aria-atomic="true"><RefreshCw className="is-spinning" aria-hidden="true" />{journalMutationOutsideCurrentCase ? `上一 Case：${JOURNAL_MUTATION_LABELS[journalMutation.kind]}` : JOURNAL_MUTATION_LABELS[journalMutation.kind]}</p> : null}
      {journalMutationIssue ? (
        <section className="journal-mutation-issue" role="alert" aria-labelledby={journalMutationIssueTitleId}>
          <header>
            <div><p className="eyebrow">Mutation reconciliation</p><h3 id={journalMutationIssueTitleId}>{journalMutationIssue.phase === "returned_unreconciled"
              ? journalMutationIssueOutsideCurrentCase ? "上一研究对象提交返回未闭环，当前日志仍锁定" : "提交已返回但绑定未闭环，研究日志已锁定"
              : journalMutationIssueOutsideCurrentCase ? "上一研究对象写入结果未知，当前日志仍锁定" : "写入结果未知，研究日志已锁定"}</h3></div>
            <StatusPill tone="warning">{journalMutationIssue.phase === "returned_unreconciled" ? "返回未闭环" : "调用未知"}</StatusPill>
          </header>
          <p>{journalMutationIssueOutsideCurrentCase ? <>上一 Case <code>{journalMutationIssue.requestedCaseId}</code> 的写入仍未对账；切换研究对象不会绕过 mutation epoch。</> : journalMutationIssue.detail} 调用可能已经提交，也可能没有提交；当前页面不会按普通失败重试或继续其他日志写入。</p>
          <dl>
            <div><dt>操作</dt><dd>{journalMutationIssue.action}</dd></div>
            <div><dt>对象类型</dt><dd>{journalMutationIssue.targetKind === "research_note" ? "研究笔记" : "事件"}</dd></div>
            <div><dt>请求 Case</dt><dd><code>{journalMutationIssue.requestedCaseId}</code></dd></div>
            <div><dt>目标 ID</dt><dd><code>{journalMutationIssue.targetId ?? "创建调用未返回新 ID"}</code></dd></div>
            <div><dt>调用前状态</dt><dd>{journalMutationIssue.expectedState}</dd></div>
            <div><dt>草稿身份</dt><dd>{journalMutationIssue.draftIdentity}</dd></div>
            <div><dt>本页操作号</dt><dd>{journalMutationIssue.operationToken}</dd></div>
            <div><dt>证据阶段</dt><dd>{journalMutationIssue.phase === "returned_unreconciled" ? "仓储已返回候选结果，提交后绑定核对失败" : "仓储调用无可信回执"}</dd></div>
            <div><dt>后续门禁</dt><dd>本页面运行期持续锁定；组件卸载、重挂或切换 Case 均不会清除</dd></div>
          </dl>
          <p>案例库只能用于只读人工核对，不会解除本页面运行期锁。当前发布代际没有足以证明本次写入已提交或未提交的幂等操作收据，因此不提供原地解锁。</p>
          <div className="journal-mutation-issue__actions">
            <AppLink href="/cases" className="secondary-action">到案例库只读核对</AppLink>
            <AppLink href="/help#recovery" className="text-link">查看异常恢复步骤</AppLink>
          </div>
        </section>
      ) : null}
      {auxiliaryLoading || auxiliaryFailed ? (
        <div className="journal-index-gate" data-tone={auxiliaryFailed ? "error" : "loading"} role={auxiliaryFailed ? "alert" : "status"}>
          <div>
            <strong>{auxiliaryFailed ? "部分研究索引暂不可用" : "正在核对引用与时间凭证"}</strong>
            <p>{citationIndexError ? `知识引用：${citationIndexError} ` : citationIndexLoading ? "知识引用索引读取中。 " : ""}{receiptIndexError ? `时间迁移凭证：${receiptIndexError} ` : receiptIndexLoading ? "时间迁移凭证读取中。" : ""}{auxiliaryFailed ? "未验真的索引不会显示为零；对应引用或派生入口保持关闭。" : ""}</p>
          </div>
          {auxiliaryFailed ? <button type="button" className="secondary-action" onClick={() => void refresh()}><RefreshCw aria-hidden="true" />重新读取完整快照</button> : null}
        </div>
      ) : null}

      <aside className="journal-boundary-strip" aria-label="研究日志证据与发布边界">
        <div className="journal-boundary-strip__item">
          <span>默认发布身份</span>
          <strong>legacy-v13</strong>
          <small>Schema 13 · migrationId null</small>
        </div>
        <div className="journal-boundary-strip__item" data-tone="research">
          <span>证据语义</span>
          <strong>工程记录层</strong>
          <small>不冒充专家真值</small>
        </div>
        <div className="journal-boundary-strip__item" data-tone="locked">
          <span>写入与发布</span>
          <strong>{journalMutationIssue ? journalMutationIssueOutsideCurrentCase ? "上一 Case 未对账，写入锁定" : "结果未知，写入锁定" : journalMutationBusy ? journalMutationOutsideCurrentCase ? "上一 Case 仓储写入进行中" : "仓储写入进行中" : "仓储写入空闲"}</strong>
          <small>禁止绕过 mutation epoch · 未声明公开发布授权</small>
        </div>
      </aside>

      <nav className="journal-workspace-nav" aria-label="研究日志工作区">
        <a href={`#${noteWorkspaceId}`} data-state={editingNote ? "editing" : "ready"}>
          <span className="journal-workspace-nav__index" aria-hidden="true">01</span>
          <span><strong>研究笔记</strong><small>{activeNoteCount} 条有效 · {notes.length} 条总计{editingNote ? " · 正在编辑" : ""}</small></span>
        </a>
        <a href={`#${eventWorkspaceId}`} data-state={editingEvent ? "editing" : selectedEvent ? "selected" : "ready"}>
          <span className="journal-workspace-nav__index" aria-hidden="true">02</span>
          <span><strong>事件验证</strong><small>{activeEventCount} 条有效 · {events.length} 条总计{editingEvent ? " · 正在编辑" : selectedEvent ? " · 已定位事件" : ""}</small></span>
        </a>
      </nav>

      {revision ? <SingleChartReportExport key={`${caseId}:${revision.id}`} caseId={caseId} revisionId={revision.id} /> : null}

      <section id={noteWorkspaceId} className="flat-section research-editor-section" aria-labelledby={noteSectionTitleId}>
        <div className="section-heading-row"><div><p className="eyebrow">Research notes</p><h2 id={noteSectionTitleId}>{editingNote ? "编辑研究笔记" : "添加可检索研究笔记"}</h2></div><StatusPill>{activeNoteCount} 条有效</StatusPill></div>
        <form onSubmit={saveNote} className="journal-form" aria-busy={noteSaving}>
          <fieldset className="journal-operation-fields" disabled={journalMutationActive}>
          {!editingNote && revision ? (
            <label className="field"><span>锚定位置</span><select value={noteAnchorMode} onChange={(event) => setNoteAnchorMode(event.target.value as NoteAnchorMode)}><option value="field">当前字段 · {selection.pillar}.{selection.field}</option><option value="revision">当前修订</option><option value="case">整个案例</option></select></label>
          ) : editingNote ? <p className="editor-context">原锚点：{noteAnchorLabel(editingNote)} · editVersion {editingNote.editVersion}</p> : <p className="editor-context">未知时辰候选组只允许案例级锚点；不会绑定代表探针、DST 变体或虚构修订。</p>}
          <label className="field"><span>Markdown 笔记 <em>必填</em></span><textarea ref={noteBodyInputRef} rows={6} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="记录观察、反例、待复核问题；不要把笔记改写成命盘事实。" maxLength={JOURNAL_BODY_MAX_LENGTH} required /></label>
          <div className="field-grid"><label className="field"><span>标签</span><input value={noteTags} onChange={(event) => setNoteTags(event.target.value)} placeholder="边界、待核验" maxLength={JOURNAL_LIST_INPUT_MAX_LENGTH} /></label><label className="field"><span>来源引用</span><input value={noteSources} onChange={(event) => setNoteSources(event.target.value)} placeholder="书名/版本/章节，用分号分隔" maxLength={JOURNAL_LIST_INPUT_MAX_LENGTH} /></label></div>
          <div className="journal-actions"><button type="submit" className="primary-action" disabled={journalMutationActive} aria-busy={noteSaving}>{noteSaving ? <RefreshCw className="is-spinning" aria-hidden="true" /> : <Save aria-hidden="true" />}{noteSaving ? "正在保存笔记…" : editingNote ? "保存新版本" : "保存笔记"}</button>{editingNote ? <button type="button" className="secondary-action" disabled={journalMutationActive} onClick={cancelNoteEdit}><X aria-hidden="true" />取消编辑</button> : null}</div>
          </fieldset>
        </form>
          <div className="journal-list">
          {renderedNotes.map((note) => {
            const linkedCitations = citationsByTarget.researchNotes.get(note.id) ?? [];
            return <article key={note.id} className={note.lifecycle === "archived" ? "is-muted" : ""}>
              <header>
                <div><strong>{noteAnchorLabel(note)}</strong><small>v{note.editVersion} · {note.lifecycle}</small></div>
                <div className="journal-actions">
                  {citationIndexReady ? <AppLink className="icon-button" aria-label="为笔记添加知识引用" href={knowledgeResearchNoteHref(note.id)}><Link2 aria-hidden="true" /></AppLink> : null}
                  <button ref={(element) => { if (element) noteEditButtonRefs.current.set(note.id, element); else noteEditButtonRefs.current.delete(note.id); }} type="button" className="icon-button" aria-label="编辑笔记" disabled={journalMutationActive} onClick={() => beginEditNote(note)}><Pencil aria-hidden="true" /></button>
                  <button type="button" className="icon-button" aria-label={note.lifecycle === "active" ? "归档笔记" : "恢复笔记"} disabled={journalMutationActive} onClick={() => void toggleNoteArchive(note)}>{note.lifecycle === "active" ? <Archive aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}</button>
                </div>
              </header>
              <p>{note.body}</p>
              {note.tags.length ? <small className="journal-tags">{note.tags.join("、")}</small> : null}
              {linkedCitations.length ? <div className="journal-structured-citations"><small>知识引用 · {linkedCitations.length}</small>{linkedCitations.map((citation) => <AppLink key={citation.id} href={`/knowledge${buildKnowledgeSearch({ documentId: citation.documentId, sectionId: citation.locator.sectionId, lineNumber: citation.locator.startLine, citationId: citation.id, target: { kind: "research_note", noteId: note.id } })}`}><blockquote>{citation.quote}</blockquote></AppLink>)}</div> : null}
            </article>;
          })}
          {notes.length > renderedNotes.length ? <div className="journal-progressive-controls"><button type="button" className="secondary-action" onClick={() => setNoteRenderLimit((current) => Math.min(current + JOURNAL_RENDER_STEP, notes.length))}>继续显示笔记</button><small>已显示 {renderedNotes.length} / {notes.length} 条，避免一次性创建过多页面节点。</small></div> : null}
          {!loading && !notes.length ? <p className="journal-empty">还没有研究笔记。</p> : null}
        </div>
      </section>

      <section id={eventWorkspaceId} className="flat-section research-editor-section" aria-labelledby={eventSectionTitleId}>
        <div className="section-heading-row"><div><p className="eyebrow">Event validation</p><h2 id={eventSectionTitleId}>{editingEvent ? "编辑研究事件" : "记录研究事件"}</h2></div><StatusPill>{activeEventCount} 条有效</StatusPill></div>
        {selectedEventError ? <div className="inline-error" role={selectedEventErrorAnnouncedByParent ? undefined : "alert"} data-parent-announcement={selectedEventErrorAnnouncedByParent ? "present" : "absent"}><strong>无法定位事件</strong><p>{safeJournalText(selectedEventError, "事件定位错误无法安全显示。")}</p></div> : null}
        {!loading && selectedEventId && !selectedEvent && !selectedEventError ? <div className="inline-error" role="alert"><strong>无法定位事件</strong><p>该 UUID 在当前案例中不存在；没有改用近似事件。</p></div> : null}
        <form onSubmit={saveEvent} className="journal-form" aria-busy={eventSaving}>
          <fieldset className="journal-operation-fields" disabled={journalMutationActive}>
          {editingEvent ? (
            <p className="editor-context">{revision ? <>编辑只更新事件内容；原修订与{editingEvent.transitNodeRef ? "运限节点绑定会被保留" : "无运限节点状态会被保留"}。</> : <>编辑只更新事件内容；候选组事件继续保持案例级，revisionId 与运限节点均为 null。</>}</p>
          ) : !revision ? (
            <p className="editor-context">候选组事件只绑定整个候选组；保存时 revisionId 与运限节点引用均保持 null。</p>
          ) : transitNode ? (
            <label className="event-transit-binding"><input type="checkbox" checked={bindSelectedNode} onChange={(event) => setBindSelectedNode(event.target.checked)} /><span><strong>绑定所选{transitNode.nodeType}节点 · {transitNode.ganZhi}</strong><small>{transitNode.startWallDateTime} 起 · 稳定引用 {transitNode.ref.nodeId.slice(0, 18)}…</small></span></label>
          ) : (
            <p className="editor-context">当前未从运限页选择节点；本事件只绑定案例与当前修订。</p>
          )}
          <div className="field-grid"><label className="field"><span>事件标题 <em>必填</em></span><input ref={eventTitleInputRef} value={eventDraft.title} onChange={(event) => updateEventDraft("title", event.target.value)} maxLength={JOURNAL_TITLE_MAX_LENGTH} required /></label><label className="field"><span>反馈</span><select value={eventDraft.feedback} onChange={(event) => updateEventDraft("feedback", event.target.value as EventDraft["feedback"])}><option value="unreviewed">未复核</option><option value="supports">支持当前假设</option><option value="contradicts">反例</option><option value="mixed">混合</option></select></label></div>
          <div className="field-grid"><label className="field"><span>日期精度</span><select disabled={editingLegacyEvent} value={eventDraft.datePrecision} onChange={(event) => setEventDraft((current) => ({ ...current, datePrecision: event.target.value as EventDraft["datePrecision"], startDate: "", endDate: "", startDisambiguation: "reject", endDisambiguation: "reject" }))}><option value="year">年</option><option value="month">月</option><option value="day">日</option><option value="minute">分钟</option><option value="unknown">未知</option></select></label><label className="field"><span>{eventDraft.datePrecision === "minute" ? "起始民用分钟" : "起始日期"}</span><input type={dateInputType} disabled={editingLegacyEvent || eventDraft.datePrecision === "unknown"} value={eventDraft.startDate} onChange={(event) => setEventDraft((current) => ({ ...current, startDate: event.target.value, startDisambiguation: "reject" }))} placeholder={eventDraft.datePrecision === "year" ? "YYYY" : undefined} /></label></div>
          <div className="field-grid"><label className="field"><span>{eventDraft.datePrecision === "minute" ? "结束民用分钟（可选）" : "结束日期（可选）"}</span><input type={dateInputType} disabled={editingLegacyEvent || eventDraft.datePrecision === "unknown"} value={eventDraft.endDate} onChange={(event) => setEventDraft((current) => ({ ...current, endDate: event.target.value, endDisambiguation: "reject" }))} placeholder={eventDraft.datePrecision === "year" ? "YYYY" : undefined} /></label><label className="field"><span>标签</span><input value={eventDraft.tags} onChange={(event) => updateEventDraft("tags", event.target.value)} placeholder="事业、搬迁、反例" maxLength={JOURNAL_LIST_INPUT_MAX_LENGTH} /></label></div>
          {eventRangeInvalid ? <div className="event-range-error" role="alert"><strong>事件时间范围无效</strong><p>{eventDraft.datePrecision === "minute" ? "按当前时区与 DST 选择解析后，结束 UTC 早于起始 UTC。" : "结束日期早于起始日期。"}</p></div> : null}
          {editingLegacyEvent ? (
            <div className="legacy-time-upgrade">
              <StatusPill tone="warning">旧版悬空时间</StatusPill>
              <p>旧记录的日期精度与起止墙钟值保持只读；本次只可编辑标题、标签、来源、反馈与正文。若要明确时间语义，请从原事件卡片创建带凭证的新 ID。</p>
            </div>
          ) : eventDraft.datePrecision === "minute" ? (
            <div className="event-time-panel">
              <label className="field"><span>事件时区（IANA） <em>必填</em></span><input list="event-time-zone-suggestions" value={eventDraft.timeZone} onChange={(event) => setEventDraft((current) => ({ ...current, timeZone: event.target.value, startDisambiguation: "reject", endDisambiguation: "reject" }))} autoComplete="off" spellCheck={false} maxLength={128} required /></label>
              <datalist id="event-time-zone-suggestions"><option value="Asia/Shanghai" /><option value="Asia/Hong_Kong" /><option value="Asia/Taipei" /><option value="America/New_York" /><option value="Europe/London" /></datalist>
              <p className="event-time-hint">默认使用研究对象时区 {subjectTimeZone}，可按事件发生地编辑。所有分钟时间均保存 IANA 时区、UTC 偏移与标准 UTC。</p>
              <MinuteBoundaryPreview label="起始" name="event-start-disambiguation" preview={startMinutePreview} disambiguation={eventDraft.startDisambiguation} onDisambiguationChange={(policy) => updateEventDraft("startDisambiguation", policy)} />
              {eventDraft.endDate ? <MinuteBoundaryPreview label="结束" name="event-end-disambiguation" preview={endMinutePreview} disambiguation={eventDraft.endDisambiguation} onDisambiguationChange={(policy) => updateEventDraft("endDisambiguation", policy)} /> : null}
            </div>
          ) : null}
          <label className="field"><span>来源引用</span><input value={eventDraft.sourceRefs} onChange={(event) => updateEventDraft("sourceRefs", event.target.value)} placeholder="日记、当事人口述、公开资料" maxLength={JOURNAL_LIST_INPUT_MAX_LENGTH} /></label>
          <label className="field"><span>事件笔记</span><textarea rows={4} value={eventDraft.body} onChange={(event) => updateEventDraft("body", event.target.value)} maxLength={JOURNAL_BODY_MAX_LENGTH} /></label>
          <div className="journal-actions"><button type="submit" className="primary-action" disabled={!eventTimeCanSave || journalMutationActive} aria-busy={eventSaving}>{eventSaving ? <RefreshCw className="is-spinning" aria-hidden="true" /> : <Plus aria-hidden="true" />}{eventSaving ? "正在保存事件…" : editingEvent ? "保存事件修改" : "添加事件"}</button>{editingEvent ? <button type="button" className="secondary-action" disabled={journalMutationActive} onClick={cancelEventEdit}><X aria-hidden="true" />取消编辑</button> : null}</div>
          </fieldset>
        </form>
        <div className="event-filter-panel" aria-label="事件筛选" data-pending={eventFilterPending}>
          <div className="event-filter-grid">
            <label className="field event-filter-keyword"><span>搜索事件</span><input type="search" value={eventKeyword} onChange={(event) => setEventKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && eventKeyword) { event.preventDefault(); setEventKeyword(""); } }} placeholder="标题、笔记、标签或来源" autoComplete="off" spellCheck={false} maxLength={240} aria-keyshortcuts="Escape" /></label>
            <label className="field"><span>生命周期</span><select ref={eventLifecycleFilterRef} value={eventLifecycle} onChange={(event) => setEventLifecycle(event.target.value as EventLifecycleFilter)}><option value="all">全部状态</option><option value="active">有效</option><option value="deleted">已软删除</option></select></label>
            <label className="field"><span>反馈筛选</span><select value={eventFeedback} onChange={(event) => setEventFeedback(event.target.value as EventFeedbackFilter)}><option value="all">全部反馈</option><option value="unreviewed">未复核</option><option value="supports">支持当前假设</option><option value="contradicts">反例</option><option value="mixed">混合</option></select></label>
            <label className="field"><span>绑定范围</span><select value={eventBinding} onChange={(event) => setEventBinding(event.target.value as EventBindingFilter)}><option value="all">全部范围</option>{revision ? <option value="current_revision">当前修订</option> : null}{revision && transitNode ? <option value="current_node">当前运限节点</option> : null}<option value="unbound">仅案例（无修订）</option></select></label>
            <label className="field"><span>事件标签</span><select value={eventTag} onChange={(event) => setEventTag(event.target.value)}><option value="all">全部标签</option>{eventTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          </div>
          <div className="event-filter-summary">
            <p role="status" aria-live="polite">{eventFilterPending ? "正在更新事件筛选结果…" : `显示 ${filteredEvents.length} / ${events.length} 条事件${selectedEventIsPinned ? "；深链事件另行固定显示" : ""}`}</p>
            <button type="button" className="secondary-action" disabled={!eventFilterActive} onClick={() => { setEventKeyword(""); setEventLifecycle("active"); setEventFeedback("all"); setEventBinding("all"); setEventTag("all"); }}>清空筛选</button>
          </div>
        </div>
        <div className="journal-list">
          {renderedEvents.map((record) => {
            const transitHref = eventTransitHref(caseId, record);
            const linkedCitations = citationsByTarget.events.get(record.id) ?? [];
            const linkedTimeMigrationReceipts = eventTimeReceiptsByEventId.get(record.id) ?? [];
            const isSelected = record.id === selectedEventId;
            return <article
              key={record.id}
              id={`event-${record.id}`}
              ref={(element) => { if (element) eventCardRefs.current.set(record.id, element); else eventCardRefs.current.delete(record.id); }}
              className={[record.deletedAt ? "is-muted" : "", isSelected ? "event-card--selected" : ""].filter(Boolean).join(" ")}
              tabIndex={isSelected || pendingEventFocusId === record.id ? -1 : undefined}
              aria-label={`事件 ${record.title}`}
              data-event-id={record.id}
            >
              <header>
                <div><strong>{record.title}</strong>{isSelected ? <small className="event-deep-link-badge">深链定位{selectedEventIsPinned ? " · 已固定显示" : ""}</small> : null}<small>{record.datePrecision === "unknown" ? "日期未知" : `${record.startDate}${record.endDate ? ` — ${record.endDate}` : ""}`} · {record.feedback}</small>{transitHref ? <AppLink className="event-transit-ref event-transit-ref--link" href={transitHref}>返回绑定运限节点 · {record.transitNodeRef?.nodeType} · {record.transitNodeRef?.nodeId.slice(0, 18)}…</AppLink> : record.transitNodeRef ? <small className="event-transit-ref">旧版运限引用 · 无法生成稳定返回链接</small> : null}</div>
                <div className="journal-actions">
                  {citationIndexReady ? <AppLink className="icon-button" aria-label="为事件添加知识引用" href={knowledgeEventHref(record.id)}><Link2 aria-hidden="true" /></AppLink> : null}
                  <button ref={(element) => { if (element) eventEditButtonRefs.current.set(record.id, element); else eventEditButtonRefs.current.delete(record.id); }} type="button" className="icon-button" aria-label="编辑事件" disabled={journalMutationActive} onClick={() => beginEditEvent(record)}><Pencil aria-hidden="true" /></button>
                  <button type="button" className="icon-button" aria-label={record.deletedAt ? "恢复事件" : "软删除事件"} disabled={journalMutationActive} onClick={() => void toggleEventDeleted(record)}>{record.deletedAt ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />}</button>
                </div>
              </header>
              <EventTimeContextSummary record={record} />
              {receiptIndexReady ? <EventTimeMigrationRelations
                receipts={linkedTimeMigrationReceipts}
                currentEventId={record.id}
                buildEventHref={eventMigrationEndpointHref}
              /> : null}
              {record.timeContext.kind === "legacy_floating" ? (
                record.deletedAt ? (
                  <p className="event-time-migration-unavailable">先恢复旧事件，才能创建带凭证的并列时间解释。</p>
                ) : !receiptIndexReady ? (
                  <p className="event-time-migration-unavailable">{receiptIndexError ? "迁移凭证索引不可用；未确认既有派生关系前，不开放新的时间解释。" : "正在核对迁移凭证；完成前不开放新的时间解释。"}</p>
                ) : (
                  <button
                    ref={(element) => { if (element) eventMigrationButtonRefs.current.set(record.id, element); else eventMigrationButtonRefs.current.delete(record.id); }}
                    type="button"
                    className="secondary-action event-time-migration-trigger"
                    disabled={journalMutationActive}
                    aria-expanded={migratingEventId === record.id}
                    onClick={() => beginEventTimeMigration(record)}
                  >
                    <RefreshCw aria-hidden="true" />
                    {linkedTimeMigrationReceipts.some((receipt) => receipt.source.recordId === record.id)
                      ? "查看或创建另一种时间解释"
                      : "解释时间并创建并列事件"}
                  </button>
                )
              ) : null}
              {migratingEventId === record.id ? (
                <EventTimeMigrationPanel
                  source={record}
                  defaultTimeZone={subjectTimeZone}
                  existingReceipts={linkedTimeMigrationReceipts}
                  buildEventHref={eventMigrationEndpointHref}
                  derive={async (
                    interpretation: EventTimeMigrationInterpretation,
                    reconcileReturnedResult: ReconcileEventTimeMigrationResult
                  ) => {
                    const operation = beginJournalMutation("event-time-migration");
                    if (!operation) throw new Error("研究日志存在进行中或结果未知的写入，未开始新的时间迁移。");
                    setError(null);
                    setMessage(null);
                    let writeCallStarted = false;
                    let writeCallReturned = false;
                    const mutationClues: JournalMutationClues = {
                      targetKind: "event",
                      targetId: record.id,
                      action: "创建并列事件时间解释与迁移凭证",
                      expectedState: `源事件 updatedAt ${record.updatedAt} · legacy_floating`,
                      draftIdentity: `${record.title} · ${record.startDate ?? "无起始时间"} · 新 ID 派生`
                    };
                    try {
                      const expectedSourceRecordDigest = await computeEventRecordDigest(record);
                      if (!componentMountedRef.current) {
                        throw new EventTimeMigrationDeriveError("not_started", "研究日志已卸载，未开始事件时间迁移写入。");
                      }
                      if (!journalMutationIsCurrent(operation)) {
                        throw new EventTimeMigrationDeriveError("not_started", "事件时间迁移写锁已失效，未开始仓储写入。");
                      }
                      if (!journalMutationTargetsVisibleCase(operation)) {
                        throw new EventTimeMigrationDeriveError("not_started", "研究对象已切换，未开始事件时间迁移写入。");
                      }
                      writeCallStarted = true;
                      const result = await researchRepository.deriveLegacyEventTime({
                        sourceEventId: record.id,
                        expectedSourceRecordDigest,
                        confirmed: true,
                        interpretation
                      });
                      writeCallReturned = true;
                      const reconciledResult = reconcileReturnedResult(result);
                      writeCallStarted = false;
                      return reconciledResult;
                    } catch (reason) {
                      let outwardReason: unknown = reason;
                      if (journalMutationIsCurrent(operation)) {
                        if (writeCallStarted) {
                          const issuePhase: JournalMutationIssuePhase = writeCallReturned
                            ? "returned_unreconciled"
                            : "call_unknown";
                          lockUnknownJournalMutation(
                            operation,
                            mutationClues,
                            reason,
                            writeCallReturned
                              ? "事件时间迁移仓储调用已返回，但提交后绑定核对失败。"
                              : "事件时间迁移仓储调用抛出未知错误。",
                            issuePhase
                          );
                          outwardReason = new EventTimeMigrationDeriveError(
                            "call_unknown",
                            writeCallReturned
                              ? "事件时间迁移仓储调用已返回，但没有形成可信的提交后绑定。"
                              : "事件时间迁移仓储调用没有返回可核对结果。"
                          );
                        } else {
                          const message = journalErrorMessage(reason, "无法准备事件时间迁移。");
                          if (journalMutationCanUpdateCurrentInstance(operation)) setError(message);
                          outwardReason = reason instanceof EventTimeMigrationDeriveError
                            && reason.certainty === "not_started"
                            ? reason
                            : new EventTimeMigrationDeriveError("not_started", message);
                        }
                      }
                      throw outwardReason;
                    } finally {
                      finishJournalMutation(operation);
                    }
                  }}
                  onDerived={registerEventTimeMigration}
                  onCancel={cancelEventTimeMigration}
                />
              ) : null}
              {record.body ? <p>{record.body}</p> : null}
              {record.tags.length ? <small className="journal-tags">{record.tags.join("、")}</small> : null}
              <div className="journal-actions">
                <button type="button" className="secondary-action" aria-label={`按此事件条件检索：${record.title}`} onClick={() => startEventResearch(record)}><Search aria-hidden="true" />按此事件条件检索</button>
              </div>
              {linkedCitations.length ? <div className="journal-structured-citations"><small>知识引用 · {linkedCitations.length}</small>{linkedCitations.map((citation) => <AppLink key={citation.id} href={`/knowledge${buildKnowledgeSearch({ documentId: citation.documentId, sectionId: citation.locator.sectionId, lineNumber: citation.locator.startLine, citationId: citation.id, target: { kind: "event", eventId: record.id } })}`}><blockquote>{citation.quote}</blockquote></AppLink>)}</div> : null}
            </article>;
          })}
          {visibleEvents.length > renderedEvents.length ? <div className="journal-progressive-controls"><button type="button" className="secondary-action" onClick={() => setEventRenderLimit((current) => Math.min(current + JOURNAL_RENDER_STEP, visibleEvents.length))}>继续显示事件</button><small>已显示 {renderedEvents.length} / {visibleEvents.length} 条当前结果。</small></div> : null}
          {!loading && !events.length ? <p className="journal-empty">还没有事件记录。</p> : null}
          {!loading && events.length > 0 && filteredEvents.length === 0 && !selectedEvent ? <p className="journal-empty">没有符合筛选条件的事件。</p> : null}
        </div>
      </section>
      </> : null}
    </div>
  );
}
