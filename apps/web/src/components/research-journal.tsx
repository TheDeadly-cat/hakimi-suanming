import { Archive, Link2, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  CitationRecord,
  DstDisambiguationPolicy,
  EventRecord,
  EventTimeMigrationEndpoint,
  EventTimeMigrationInterpretation,
  EventTimeMigrationReceipt,
  ResearchNoteAnchor,
  ResearchNoteRecord,
  RevisionRecord,
  TransitNode
} from "@hakimi/contracts";
import { computeEventRecordDigest, knowledgeRepository, researchRepository } from "@hakimi/storage";
import {
  classifyStoredTimeZoneDatabaseForReplay,
  verifyEventTimeContextWithBundledArtifact
} from "@hakimi/time-core";
import { buildKnowledgeSearch, knowledgeEventHref, knowledgeResearchNoteHref } from "../lib/knowledge-route";
import { buildEventResearchQuery } from "../lib/event-research-query";
import { buildResearchQuerySearch } from "../lib/research-query-route";
import { createResearchQueryDraft } from "../lib/research-query-session";
import { AppLink, navigate } from "../lib/router";
import { buildChartSearch } from "../lib/transit-route";
import {
  EventTimeMigrationPanel,
  EventTimeMigrationRelations,
  MinuteBoundaryPreview,
  minuteBoundaryCanSave,
  previewCivilMinute,
  type EventTimeMigrationResult,
  type MinutePreviewState
} from "./event-time-migration-panel";
import type { MatrixSelection } from "./four-pillars-matrix";
import { SingleChartReportExport } from "./single-chart-report-export";
import { StatusPill } from "./status-pill";

type NoteAnchorMode = "field" | "revision" | "case";
type Citation = CitationRecord;
type EventLifecycleFilter = "all" | "active" | "deleted";
type EventFeedbackFilter = "all" | EventRecord["feedback"];
type EventBindingFilter = "all" | "current_revision" | "current_node" | "unbound";

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
  const [replayResult, setReplayResult] = useState<"idle" | "checking" | "passed" | "failed">("idle");
  const [replayMessage, setReplayMessage] = useState<string | null>(null);
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
  const verifyOriginalArtifact = async () => {
    setReplayResult("checking");
    setReplayMessage(null);
    try {
      await verifyEventTimeContextWithBundledArtifact({
        datePrecision: record.datePrecision,
        startDate: record.startDate,
        endDate: record.endDate,
        timeContext
      });
      setReplayResult("passed");
      setReplayMessage(`已按 IANA ${timeContext.timeZoneDatabase?.ianaVersion ?? "未知"} 原工件复核，冻结 UTC 与 DST 候选一致。`);
    } catch (reason) {
      setReplayResult("failed");
      setReplayMessage(reason instanceof Error ? reason.message : "历史时区复核失败；记录未被改写。" );
    }
  };
  return (
    <div className="event-time-record">
      <strong>{timeContext.timeZone}</strong>
      <span>{timeContext.timeZoneDatabase ? `IANA ${timeContext.timeZoneDatabase.ianaVersion} 固定快照` : "旧版浏览器 Intl · 具体 tzdb 未识别"}</span>
      <span>起始 {start.resolution.selectedCandidate.utcOffset} · UTC {start.canonicalUtc}{start.resolution.kind === "overlap" ? ` · ${start.resolution.selectedCandidate.choice}` : ""}</span>
      {end ? <span>结束 {end.resolution.selectedCandidate.utcOffset} · UTC {end.canonicalUtc}{end.resolution.kind === "overlap" ? ` · ${end.resolution.selectedCandidate.choice}` : ""}</span> : null}
      <span>
        <StatusPill tone={replayStatus === "current_exact" ? "info" : replayStatus === "retained_exact" ? "jade" : "warning"}>
          {replayStatus === "current_exact" ? "当前工件可复算" : replayStatus === "retained_exact" ? "当前应用保留历史工件" : replayStatus === "artifact_unavailable" ? "当前应用未保留历史工件" : "时区描述符冲突"}
        </StatusPill>
      </span>
      {replayStatus === "retained_exact" ? (
        <button type="button" className="text-button" disabled={replayResult === "checking"} onClick={() => void verifyOriginalArtifact()}>
          {replayResult === "checking" ? "正在按原工件复核…" : `按 IANA ${timeContext.timeZoneDatabase?.ianaVersion} 原工件复核`}
        </button>
      ) : null}
      {replayMessage ? <span role="status" className={replayResult === "failed" ? "inline-error" : undefined}>{replayMessage}</span> : null}
    </div>
  );
}

type ResearchJournalProps = {
  caseId: string;
  defaultTimeZone?: string;
  selectedEventId?: string | null;
  selectedEventError?: string | null;
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
  onSelectEvent
}: ResearchJournalProps) {
  const [notes, setNotes] = useState<ResearchNoteRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [eventTimeMigrationReceipts, setEventTimeMigrationReceipts] = useState<EventTimeMigrationReceipt[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [eventLifecycle, setEventLifecycle] = useState<EventLifecycleFilter>("active");
  const [eventFeedback, setEventFeedback] = useState<EventFeedbackFilter>("all");
  const [eventBinding, setEventBinding] = useState<EventBindingFilter>("all");
  const [eventTag, setEventTag] = useState("all");
  const [migratingEventId, setMigratingEventId] = useState<string | null>(null);
  const [pendingEventFocusId, setPendingEventFocusId] = useState<string | null>(null);
  const eventCardRefs = useRef(new Map<string, HTMLElement>());
  const eventEditButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const eventMigrationButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastDeepLinkedEventFocusKeyRef = useRef<string | null>(null);
  const eventTitleInputRef = useRef<HTMLInputElement>(null);
  const eventLifecycleFilterRef = useRef<HTMLSelectElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const citationPromise = knowledgeRepository.listCitations().catch(() => [] as Citation[]);
      const [nextNotes, nextEvents, nextCitations] = await Promise.all([
        researchRepository.listResearchNotesByCase(caseId, { includeArchived: true }),
        researchRepository.listEventsByCase(caseId, { includeDeleted: true }),
        citationPromise
      ]);
      const receiptGroups = await Promise.all(
        nextEvents.map((record) => researchRepository.listEventTimeMigrationReceiptsForEvent(record.id))
      );
      const receiptsById = new Map<string, EventTimeMigrationReceipt>();
      for (const receipt of receiptGroups.flat()) receiptsById.set(receipt.id, receipt);
      setNotes(nextNotes);
      setEvents(nextEvents);
      setCitations(nextCitations);
      setEventTimeMigrationReceipts(
        [...receiptsById.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取研究资料。");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    const keyword = eventKeyword.trim().toLocaleLowerCase("zh-CN");
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
  }, [eventBinding, eventFeedback, eventKeyword, eventLifecycle, eventTag, events, revision, transitNode]);

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
    card.focus({ preventScroll: true });
    card.scrollIntoView?.({ block: "center", behavior: "smooth" });
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

  const resetNoteEditor = () => {
    setEditingNote(null);
    setNoteBody("");
    setNoteTags("");
    setNoteSources("");
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!noteBody.trim()) {
      setError("研究笔记不能为空。");
      return;
    }
    try {
      if (editingNote) {
        await researchRepository.updateResearchNote(editingNote.id, {
          expectedEditVersion: editingNote.editVersion,
          patch: { body: noteBody, tags: splitList(noteTags), sourceRefs: splitList(noteSources) }
        });
        setMessage("研究笔记已生成新编辑版本。");
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
        await researchRepository.createResearchNote({
          caseId,
          anchor,
          body: noteBody,
          tags: splitList(noteTags),
          sourceRefs: splitList(noteSources),
          lifecycle: "active"
        });
        setMessage(revision ? "研究笔记已保存到本地案例。" : "案例级研究笔记已保存到候选组。");
      }
      resetNoteEditor();
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "研究笔记保存失败。");
    }
  };

  const beginEditNote = (note: ResearchNoteRecord) => {
    setEditingNote(note);
    setNoteBody(note.body);
    setNoteTags(note.tags.join("、"));
    setNoteSources(note.sourceRefs.join("\n"));
  };

  const toggleNoteArchive = async (note: ResearchNoteRecord) => {
    setError(null);
    try {
      await researchRepository.updateResearchNote(note.id, {
        expectedEditVersion: note.editVersion,
        patch: { lifecycle: note.lifecycle === "active" ? "archived" : "active" }
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法更新笔记状态。");
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

  const beginEventTimeMigration = (record: EventRecord) => {
    resetEventEditor();
    setMigratingEventId(record.id);
    onSelectEvent?.(record.id, { replace: true });
  };

  const registerEventTimeMigration = (result: EventTimeMigrationResult) => {
    setEvents((current) => {
      const byId = new Map(current.map((record) => [record.id, record]));
      byId.set(result.source.id, result.source);
      byId.set(result.target.id, result.target);
      return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
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
    setError(null);
    setMessage(null);
    if (!eventDraft.title.trim()) {
      setError("事件标题不能为空。");
      eventTitleInputRef.current?.focus();
      return;
    }
    try {
      const dateValues = eventDraft.datePrecision === "unknown"
        ? { startDate: null, endDate: null }
        : { startDate: eventDraft.startDate || null, endDate: eventDraft.endDate || null };
      if (!minuteTimeCanSave) {
        setError("分钟级事件时间尚未完成精确解析；请处理时区、DST 重叠或空档后再保存。");
        return;
      }
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
      if (editingEvent) {
        saved = await researchRepository.updateEvent(editingEvent.id, editingLegacyEvent ? contentPayload : payload);
        setMessage("事件记录已更新。");
      } else {
        const bindsTransitNode = Boolean(revision && bindSelectedNode && transitNode);
        saved = await researchRepository.createEvent({
          caseId,
          revisionId: revision?.id ?? null,
          transitNodeRef: bindsTransitNode && transitNode ? transitNode.ref : null,
          ...payload
        });
        setMessage(!revision
          ? "事件已链接到当前候选组；revisionId 保持 null。"
          : bindsTransitNode
            ? "事件已链接到当前案例、修订与运限节点。"
            : "事件已链接到当前案例与修订。");
      }
      setEvents((current) => {
        const byId = new Map(current.map((record) => [record.id, record]));
        byId.set(saved.id, saved);
        return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      resetEventEditor();
      await refresh();
      setPendingEventFocusId(saved.id);
      onSelectEvent?.(saved.id, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "事件保存失败。");
      eventTitleInputRef.current?.focus();
    }
  };

  const beginEditEvent = (record: EventRecord) => {
    onSelectEvent?.(record.id, { replace: true });
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
        reason instanceof Error || (typeof DOMException !== "undefined" && reason instanceof DOMException)
          ? reason.message
          : "无法从此事件建立研究查询草稿。"
      );
    }
  };

  const toggleEventDeleted = async (record: EventRecord) => {
    setError(null);
    try {
      if (migratingEventId === record.id) setMigratingEventId(null);
      if (record.deletedAt) await researchRepository.restoreEvent(record.id);
      else await researchRepository.softDeleteEvent(record.id);
      await refresh();
      const hiddenByLifecycle = (!record.deletedAt && eventLifecycle === "active") || (Boolean(record.deletedAt) && eventLifecycle === "deleted");
      if (hiddenByLifecycle && selectedEventId !== record.id) {
        window.requestAnimationFrame(() => eventLifecycleFilterRef.current?.focus());
      } else {
        setPendingEventFocusId(record.id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法更新事件状态。");
    }
  };

  const dateInputType = eventInputType(eventDraft.datePrecision);

  return (
    <div className="research-journal">
      {loading ? <p className="research-loading" role="status">正在读取研究资料…</p> : null}
      {error ? <div className="inline-error" role="alert"><strong>研究资料操作未完成</strong><p>{error}</p></div> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      {revision ? <SingleChartReportExport key={`${caseId}:${revision.id}`} caseId={caseId} revisionId={revision.id} /> : null}

      <section className="flat-section research-editor-section">
        <div className="section-heading-row"><div><p className="eyebrow">Research notes</p><h2>{editingNote ? "编辑研究笔记" : "添加可检索研究笔记"}</h2></div><StatusPill>{notes.filter((note) => note.lifecycle === "active").length} 条有效</StatusPill></div>
        <form onSubmit={saveNote} className="journal-form">
          {!editingNote && revision ? (
            <label className="field"><span>锚定位置</span><select value={noteAnchorMode} onChange={(event) => setNoteAnchorMode(event.target.value as NoteAnchorMode)}><option value="field">当前字段 · {selection.pillar}.{selection.field}</option><option value="revision">当前修订</option><option value="case">整个案例</option></select></label>
          ) : editingNote ? <p className="editor-context">原锚点：{noteAnchorLabel(editingNote)} · editVersion {editingNote.editVersion}</p> : <p className="editor-context">未知时辰候选组只允许案例级锚点；不会绑定代表探针、DST 变体或虚构修订。</p>}
          <label className="field"><span>Markdown 笔记 <em>必填</em></span><textarea rows={6} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="记录观察、反例、待复核问题；不要把笔记改写成命盘事实。" /></label>
          <div className="field-grid"><label className="field"><span>标签</span><input value={noteTags} onChange={(event) => setNoteTags(event.target.value)} placeholder="边界、待核验" /></label><label className="field"><span>来源引用</span><input value={noteSources} onChange={(event) => setNoteSources(event.target.value)} placeholder="书名/版本/章节，用分号分隔" /></label></div>
          <div className="journal-actions"><button type="submit" className="primary-action"><Save aria-hidden="true" />{editingNote ? "保存新版本" : "保存笔记"}</button>{editingNote ? <button type="button" className="secondary-action" onClick={resetNoteEditor}><X aria-hidden="true" />取消编辑</button> : null}</div>
        </form>
        <div className="journal-list">
          {notes.map((note) => {
            const linkedCitations = citations.filter((citation) => citation.targets.some((target) => target.kind === "research_note" && target.noteId === note.id));
            return <article key={note.id} className={note.lifecycle === "archived" ? "is-muted" : ""}>
              <header>
                <div><strong>{noteAnchorLabel(note)}</strong><small>v{note.editVersion} · {note.lifecycle}</small></div>
                <div className="journal-actions">
                  <AppLink className="icon-button" aria-label="为笔记添加知识引用" href={knowledgeResearchNoteHref(note.id)}><Link2 aria-hidden="true" /></AppLink>
                  <button type="button" className="icon-button" aria-label="编辑笔记" onClick={() => beginEditNote(note)}><Pencil aria-hidden="true" /></button>
                  <button type="button" className="icon-button" aria-label={note.lifecycle === "active" ? "归档笔记" : "恢复笔记"} onClick={() => void toggleNoteArchive(note)}>{note.lifecycle === "active" ? <Archive aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}</button>
                </div>
              </header>
              <p>{note.body}</p>
              {note.tags.length ? <small className="journal-tags">{note.tags.join("、")}</small> : null}
              {linkedCitations.length ? <div className="journal-structured-citations"><small>知识引用 · {linkedCitations.length}</small>{linkedCitations.map((citation) => <AppLink key={citation.id} href={`/knowledge${buildKnowledgeSearch({ documentId: citation.documentId, sectionId: citation.locator.sectionId, lineNumber: citation.locator.startLine, citationId: citation.id, target: { kind: "research_note", noteId: note.id } })}`}><blockquote>{citation.quote}</blockquote></AppLink>)}</div> : null}
            </article>;
          })}
          {!loading && !notes.length ? <p className="journal-empty">还没有研究笔记。</p> : null}
        </div>
      </section>

      <section className="flat-section research-editor-section">
        <div className="section-heading-row"><div><p className="eyebrow">Event validation</p><h2>{editingEvent ? "编辑事件" : "记录真实事件"}</h2></div><StatusPill>{events.filter((record) => !record.deletedAt).length} 条有效</StatusPill></div>
        {selectedEventError ? <div className="inline-error" role="alert"><strong>无法定位事件</strong><p>{selectedEventError}</p></div> : null}
        {!loading && selectedEventId && !selectedEvent && !selectedEventError ? <div className="inline-error" role="alert"><strong>无法定位事件</strong><p>该 UUID 在当前案例中不存在；没有改用近似事件。</p></div> : null}
        <form onSubmit={saveEvent} className="journal-form">
          {editingEvent ? (
            <p className="editor-context">{revision ? <>编辑只更新事件内容；原修订与{editingEvent.transitNodeRef ? "运限节点绑定会被保留" : "无运限节点状态会被保留"}。</> : <>编辑只更新事件内容；候选组事件继续保持案例级，revisionId 与运限节点均为 null。</>}</p>
          ) : !revision ? (
            <p className="editor-context">候选组事件只绑定整个候选组；保存时 revisionId 与运限节点引用均保持 null。</p>
          ) : transitNode ? (
            <label className="event-transit-binding"><input type="checkbox" checked={bindSelectedNode} onChange={(event) => setBindSelectedNode(event.target.checked)} /><span><strong>绑定所选{transitNode.nodeType}节点 · {transitNode.ganZhi}</strong><small>{transitNode.startWallDateTime} 起 · 稳定引用 {transitNode.ref.nodeId.slice(0, 18)}…</small></span></label>
          ) : (
            <p className="editor-context">当前未从运限页选择节点；本事件只绑定案例与当前修订。</p>
          )}
          <div className="field-grid"><label className="field"><span>事件标题 <em>必填</em></span><input ref={eventTitleInputRef} value={eventDraft.title} onChange={(event) => updateEventDraft("title", event.target.value)} /></label><label className="field"><span>反馈</span><select value={eventDraft.feedback} onChange={(event) => updateEventDraft("feedback", event.target.value as EventDraft["feedback"])}><option value="unreviewed">未复核</option><option value="supports">支持当前假设</option><option value="contradicts">反例</option><option value="mixed">混合</option></select></label></div>
          <div className="field-grid"><label className="field"><span>日期精度</span><select disabled={editingLegacyEvent} value={eventDraft.datePrecision} onChange={(event) => setEventDraft((current) => ({ ...current, datePrecision: event.target.value as EventDraft["datePrecision"], startDate: "", endDate: "", startDisambiguation: "reject", endDisambiguation: "reject" }))}><option value="year">年</option><option value="month">月</option><option value="day">日</option><option value="minute">分钟</option><option value="unknown">未知</option></select></label><label className="field"><span>{eventDraft.datePrecision === "minute" ? "起始民用分钟" : "起始日期"}</span><input type={dateInputType} disabled={editingLegacyEvent || eventDraft.datePrecision === "unknown"} value={eventDraft.startDate} onChange={(event) => setEventDraft((current) => ({ ...current, startDate: event.target.value, startDisambiguation: "reject" }))} placeholder={eventDraft.datePrecision === "year" ? "YYYY" : undefined} /></label></div>
          <div className="field-grid"><label className="field"><span>{eventDraft.datePrecision === "minute" ? "结束民用分钟（可选）" : "结束日期（可选）"}</span><input type={dateInputType} disabled={editingLegacyEvent || eventDraft.datePrecision === "unknown"} value={eventDraft.endDate} onChange={(event) => setEventDraft((current) => ({ ...current, endDate: event.target.value, endDisambiguation: "reject" }))} placeholder={eventDraft.datePrecision === "year" ? "YYYY" : undefined} /></label><label className="field"><span>标签</span><input value={eventDraft.tags} onChange={(event) => updateEventDraft("tags", event.target.value)} placeholder="事业、搬迁、反例" /></label></div>
          {editingLegacyEvent ? (
            <div className="legacy-time-upgrade">
              <StatusPill tone="warning">旧版悬空时间</StatusPill>
              <p>旧记录的日期精度与起止墙钟值保持只读；本次只可编辑标题、标签、来源、反馈与正文。若要明确时间语义，请从原事件卡片创建带凭证的新 ID。</p>
            </div>
          ) : eventDraft.datePrecision === "minute" ? (
            <div className="event-time-panel">
              <label className="field"><span>事件时区（IANA） <em>必填</em></span><input list="event-time-zone-suggestions" value={eventDraft.timeZone} onChange={(event) => setEventDraft((current) => ({ ...current, timeZone: event.target.value, startDisambiguation: "reject", endDisambiguation: "reject" }))} autoComplete="off" /></label>
              <datalist id="event-time-zone-suggestions"><option value="Asia/Shanghai" /><option value="Asia/Hong_Kong" /><option value="Asia/Taipei" /><option value="America/New_York" /><option value="Europe/London" /></datalist>
              <p className="event-time-hint">默认使用研究对象时区 {subjectTimeZone}，可按事件发生地编辑。所有分钟时间均保存 IANA 时区、UTC 偏移与标准 UTC。</p>
              <MinuteBoundaryPreview label="起始" name="event-start-disambiguation" preview={startMinutePreview} disambiguation={eventDraft.startDisambiguation} onDisambiguationChange={(policy) => updateEventDraft("startDisambiguation", policy)} />
              {eventDraft.endDate ? <MinuteBoundaryPreview label="结束" name="event-end-disambiguation" preview={endMinutePreview} disambiguation={eventDraft.endDisambiguation} onDisambiguationChange={(policy) => updateEventDraft("endDisambiguation", policy)} /> : null}
            </div>
          ) : null}
          <label className="field"><span>来源引用</span><input value={eventDraft.sourceRefs} onChange={(event) => updateEventDraft("sourceRefs", event.target.value)} placeholder="日记、当事人口述、公开资料" /></label>
          <label className="field"><span>事件笔记</span><textarea rows={4} value={eventDraft.body} onChange={(event) => updateEventDraft("body", event.target.value)} /></label>
          <div className="journal-actions"><button type="submit" className="primary-action" disabled={!minuteTimeCanSave}><Plus aria-hidden="true" />{editingEvent ? "保存事件修改" : "添加事件"}</button>{editingEvent ? <button type="button" className="secondary-action" onClick={cancelEventEdit}><X aria-hidden="true" />取消编辑</button> : null}</div>
        </form>
        <div className="event-filter-panel" aria-label="事件筛选">
          <div className="event-filter-grid">
            <label className="field event-filter-keyword"><span>搜索事件</span><input type="search" value={eventKeyword} onChange={(event) => setEventKeyword(event.target.value)} placeholder="标题、笔记、标签或来源" /></label>
            <label className="field"><span>生命周期</span><select ref={eventLifecycleFilterRef} value={eventLifecycle} onChange={(event) => setEventLifecycle(event.target.value as EventLifecycleFilter)}><option value="all">全部状态</option><option value="active">有效</option><option value="deleted">已软删除</option></select></label>
            <label className="field"><span>反馈筛选</span><select value={eventFeedback} onChange={(event) => setEventFeedback(event.target.value as EventFeedbackFilter)}><option value="all">全部反馈</option><option value="unreviewed">未复核</option><option value="supports">支持当前假设</option><option value="contradicts">反例</option><option value="mixed">混合</option></select></label>
            <label className="field"><span>绑定范围</span><select value={eventBinding} onChange={(event) => setEventBinding(event.target.value as EventBindingFilter)}><option value="all">全部范围</option>{revision ? <option value="current_revision">当前修订</option> : null}{revision && transitNode ? <option value="current_node">当前运限节点</option> : null}<option value="unbound">仅案例（无修订）</option></select></label>
            <label className="field"><span>事件标签</span><select value={eventTag} onChange={(event) => setEventTag(event.target.value)}><option value="all">全部标签</option>{eventTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          </div>
          <div className="event-filter-summary">
            <p role="status">显示 {filteredEvents.length} / {events.length} 条事件{selectedEventIsPinned ? "；深链事件另行固定显示" : ""}</p>
            <button type="button" className="secondary-action" onClick={() => { setEventKeyword(""); setEventLifecycle("active"); setEventFeedback("all"); setEventBinding("all"); setEventTag("all"); }}>清空筛选</button>
          </div>
        </div>
        <div className="journal-list">
          {visibleEvents.map((record) => {
            const transitHref = eventTransitHref(caseId, record);
            const linkedCitations = citations.filter((citation) => citation.targets.some((target) => target.kind === "event" && target.eventId === record.id));
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
                  <AppLink className="icon-button" aria-label="为事件添加知识引用" href={knowledgeEventHref(record.id)}><Link2 aria-hidden="true" /></AppLink>
                  <button ref={(element) => { if (element) eventEditButtonRefs.current.set(record.id, element); else eventEditButtonRefs.current.delete(record.id); }} type="button" className="icon-button" aria-label="编辑事件" onClick={() => beginEditEvent(record)}><Pencil aria-hidden="true" /></button>
                  <button type="button" className="icon-button" aria-label={record.deletedAt ? "恢复事件" : "软删除事件"} onClick={() => void toggleEventDeleted(record)}>{record.deletedAt ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />}</button>
                </div>
              </header>
              <EventTimeContextSummary record={record} />
              <EventTimeMigrationRelations
                receipts={linkedTimeMigrationReceipts}
                currentEventId={record.id}
                buildEventHref={eventMigrationEndpointHref}
              />
              {record.timeContext.kind === "legacy_floating" ? (
                record.deletedAt ? (
                  <p className="event-time-migration-unavailable">先恢复旧事件，才能创建带凭证的并列时间解释。</p>
                ) : (
                  <button
                    ref={(element) => { if (element) eventMigrationButtonRefs.current.set(record.id, element); else eventMigrationButtonRefs.current.delete(record.id); }}
                    type="button"
                    className="secondary-action event-time-migration-trigger"
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
                  derive={async (interpretation: EventTimeMigrationInterpretation) => {
                    const expectedSourceRecordDigest = await computeEventRecordDigest(record);
                    return researchRepository.deriveLegacyEventTime({
                      sourceEventId: record.id,
                      expectedSourceRecordDigest,
                      confirmed: true,
                      interpretation
                    });
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
          {!loading && !events.length ? <p className="journal-empty">还没有事件记录。</p> : null}
          {!loading && events.length > 0 && filteredEvents.length === 0 && !selectedEvent ? <p className="journal-empty">没有符合筛选条件的事件。</p> : null}
        </div>
      </section>
    </div>
  );
}
