import {
  ArrowRight,
  BookmarkPlus,
  FilePlus2,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  X
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import {
  caseTagsSchema,
  isCandidateSetRecord,
  normalizeResearchQueryText,
  type ResearchSubjectRecord,
  type SavedViewRecord
} from "@hakimi/contracts";
import { createDefaultResearchQuery } from "@hakimi/research-query";
import {
  caseRepository,
  researchRepository,
  type ResearchSubjectPageCursor
} from "@hakimi/storage";
import { CsvCaseImporter } from "../components/csv-case-importer";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { formatDateTime } from "../lib/format";
import { AppLink } from "../lib/router";

type LibraryScope = "all" | "favorites" | "trash";
type SubjectKind = "all" | "cases" | "candidate_sets";
type SimpleLibraryViewTarget = { libraryScope: LibraryScope; subjectKind: Exclude<SubjectKind, "all"> };

type MetadataPatch = {
  alias: string;
  tags: string[];
  notes: string;
};

type MetadataEditorRowProps = {
  subject: ResearchSubjectRecord;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: MetadataPatch) => Promise<void>;
};

const libraryScopes: ReadonlyArray<{ id: LibraryScope; label: string; help: string }> = [
  { id: "all", label: "全部", help: "全部未删除记录" },
  { id: "favorites", label: "收藏", help: "仅显示已收藏且未删除的记录" },
  { id: "trash", label: "回收站", help: "已移入回收站的记录" }
];

const CASE_LIBRARY_PAGE_SIZE = 50;
const CASE_LIBRARY_SEARCH_DEBOUNCE_MS = 250;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function parseTags(value: string): string[] {
  return value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
}

function simpleLibraryTarget(view: SavedViewRecord): SimpleLibraryViewTarget | null {
  if (view.state !== "ready") return null;
  let subjectKind: SimpleLibraryViewTarget["subjectKind"];
  if (view.query.scope === "cases") {
    subjectKind = "cases";
    if (view.query.lifecycle === "all") return null;
    const expected = {
      ...createDefaultResearchQuery("cases"),
      text: view.query.text,
      lifecycle: view.query.lifecycle,
      favorites: view.query.favorites,
    };
    if (JSON.stringify(view.query) !== JSON.stringify(expected)) return null;
  } else if (view.query.scope === "candidate_sets") {
    subjectKind = "candidate_sets";
    if (view.query.lifecycle === "all") return null;
    const expected = {
      ...createDefaultResearchQuery("candidate_sets"),
      text: view.query.text,
      lifecycle: view.query.lifecycle,
      favorites: view.query.favorites,
    };
    if (JSON.stringify(view.query) !== JSON.stringify(expected)) return null;
  } else {
    return null;
  }
  return {
    libraryScope: view.query.lifecycle === "trashed" ? "trash" : view.query.favorites === "only" ? "favorites" : "all",
    subjectKind,
  };
}

function subjectTypeLabel(subject: ResearchSubjectRecord): string {
  return isCandidateSetRecord(subject) ? "候选组" : "案例";
}

function matchesImmediateLibraryFilter(
  subject: ResearchSubjectRecord,
  scope: LibraryScope,
  kind: SubjectKind
): boolean {
  const kindMatches = kind === "all"
    || (kind === "candidate_sets" ? isCandidateSetRecord(subject) : !isCandidateSetRecord(subject));
  if (!kindMatches) return false;
  if (scope === "trash") return subject.deletedAt !== null;
  if (subject.deletedAt !== null) return false;
  return scope !== "favorites" || subject.favorite;
}

function MetadataEditorRow({ subject, saving, onCancel, onSave }: MetadataEditorRowProps) {
  const editorId = `subject-metadata-editor-${subject.id}`;
  const headingId = `${editorId}-title`;
  const errorId = `${editorId}-error`;
  const [alias, setAlias] = useState(subject.alias);
  const [tags, setTags] = useState(subject.tags.join("，"));
  const [notes, setNotes] = useState(subject.notes);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"alias" | "tags" | "notes" | null>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    aliasRef.current?.focus();
    aliasRef.current?.select();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedAlias = alias.trim();
    if (!normalizedAlias) {
      setError("案例别名不能为空。");
      setInvalidField("alias");
      aliasRef.current?.focus();
      return;
    }
    if (normalizedAlias.length > 80) {
      setError("案例别名最多 80 个字符。");
      setInvalidField("alias");
      aliasRef.current?.focus();
      return;
    }
    const parsedTags = caseTagsSchema.safeParse(parseTags(tags));
    if (!parsedTags.success) {
      setError(parsedTags.error.issues[0]?.message ?? "标签不符合保存规则。");
      setInvalidField("tags");
      tagsRef.current?.focus();
      return;
    }
    if (notes.length > 20_000) {
      setError("案例备注最多 20,000 个字符。");
      setInvalidField("notes");
      notesRef.current?.focus();
      return;
    }

    setError(null);
    setInvalidField(null);
    try {
      await onSave({ alias: normalizedAlias, tags: parsedTags.data, notes });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法保存案例资料。");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Escape" || saving) return;
    event.preventDefault();
    onCancel();
  };

  return (
    <tr className="case-edit-row">
      <td colSpan={6}>
        <form
          id={editorId}
          className="case-metadata-editor"
          role="region"
          aria-labelledby={headingId}
          aria-busy={saving || undefined}
          onSubmit={(event) => void submit(event)}
          onKeyDown={handleKeyDown}
          noValidate
        >
          <div className="case-editor-heading">
            <div>
              <p className="eyebrow">Metadata</p>
              <h3 id={headingId}>编辑“{subject.alias}”</h3>
            </div>
            <StatusPill>{isCandidateSetRecord(subject) ? "时辰待考" : "正式命盘"}</StatusPill>
          </div>
          <div className="case-editor-grid">
            <label className="field">
              <span>案例别名 <em>必填</em></span>
              <input
                ref={aliasRef}
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                required
                maxLength={80}
                aria-invalid={invalidField === "alias" || undefined}
                aria-describedby={invalidField === "alias" && error ? errorId : undefined}
              />
            </label>
            <label className="field">
              <span>标签</span>
              <input
                ref={tagsRef}
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="用逗号分隔"
                aria-invalid={invalidField === "tags" || undefined}
                aria-describedby={invalidField === "tags" && error ? errorId : undefined}
              />
            </label>
            <label className="field case-editor-notes">
              <span>案例备注</span>
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                maxLength={20_000}
                aria-invalid={invalidField === "notes" || undefined}
                aria-describedby={invalidField === "notes" && error ? errorId : undefined}
              />
            </label>
          </div>
          {error ? <div className="inline-error case-editor-error" id={errorId} role="alert"><strong>还不能保存</strong><p>{error}</p></div> : null}
          <div className="case-editor-actions">
            <button type="submit" className="primary-action" disabled={saving}><Save aria-hidden="true" />{saving ? "正在保存" : "保存资料"}</button>
            <button type="button" className="secondary-action" disabled={saving} onClick={onCancel}><X aria-hidden="true" />取消</button>
            <small>按 Esc 可取消编辑；出生资料与历史 Revision 不会被改写。</small>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function CaseLibraryPage() {
  const [scope, setScope] = useState<LibraryScope>("all");
  const [subjectKind, setSubjectKind] = useState<SubjectKind>("all");
  const lifecycle = scope === "trash" ? "trashed" : "active";
  const favoritesOnly = scope === "favorites";
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, CASE_LIBRARY_SEARCH_DEBOUNCE_MS);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const [subjects, setSubjects] = useState<ResearchSubjectRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [noteMatches, setNoteMatches] = useState(new Map<string, number>());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<ResearchSubjectPageCursor | null>>([null]);
  const [nextCursor, setNextCursor] = useState<ResearchSubjectPageCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [viewName, setViewName] = useState("");
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<ResearchSubjectRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResearchSubjectRecord | null>(null);
  const [mutation, setMutation] = useState<{ subjectId: string; action: "favorite" | "metadata" | "trash" | "restore" | "delete" } | null>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const scopeButtonRefs = useRef(new Map<LibraryScope, HTMLButtonElement>());
  const deleteReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const permanentDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const requestVersionRef = useRef(0);
  const refreshWaitersRef = useRef<Array<() => void>>([]);
  const currentCursor = pageCursors[pageIndex] ?? null;
  const cursorUpdatedAt = currentCursor?.updatedAt ?? "";
  const cursorId = currentCursor?.id ?? "";
  const cursorKind = currentCursor?.kind ?? "";
  const cursorQueryKey = currentCursor?.queryKey ?? "";
  const queryIsSettling = query !== debouncedQuery || debouncedQuery !== deferredQuery;
  const searching = (Boolean(deferredQuery.trim()) && loading) || queryIsSettling;

  const resetPagination = useCallback(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setEditingSubject(null);
    setPendingDelete(null);
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      refreshWaitersRef.current.push(resolve);
      resetPagination();
      setReloadToken((current) => current + 1);
    });
  }, [resetPagination]);

  const refreshViews = useCallback(async () => {
    try {
      setSavedViews(await researchRepository.listSavedViews());
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法读取保存视图。");
    }
  }, []);

  useEffect(() => {
    void refreshViews();
  }, [refreshViews]);

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    let active = true;
    const normalized = deferredQuery.trim();
    setLoading(true);
    setError(null);
    setResearchError(null);

    void (async () => {
      if (normalized) {
        const page = await researchRepository.searchCasesAndNotesPage(normalized, {
          lifecycle,
          favoritesOnly,
          kind: subjectKind,
          limit: CASE_LIBRARY_PAGE_SIZE,
          cursor: currentCursor
        });
        return {
          subjects: page.items.map((hit) => hit.caseRecord),
          noteMatches: new Map(page.items.map((hit) => [hit.caseRecord.id, hit.matchingNoteIds.length])),
          total: page.total,
          nextCursor: page.nextCursor
        };
      }
      const page = await caseRepository.listResearchSubjectsPage({
        lifecycle,
        favoritesOnly,
        kind: subjectKind,
        limit: CASE_LIBRARY_PAGE_SIZE,
        cursor: currentCursor
      });
      return {
        subjects: page.items,
        noteMatches: new Map<string, number>(),
        total: page.total,
        nextCursor: page.nextCursor
      };
    })().then((page) => {
      if (!active || requestVersion !== requestVersionRef.current) return;
      setSubjects(page.subjects);
      setNoteMatches(page.noteMatches);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    }).catch((reason: unknown) => {
      if (!active || requestVersion !== requestVersionRef.current) return;
      setError(reason instanceof Error ? reason.message : normalized ? "研究检索失败。" : "无法读取本地研究记录分页。");
    }).finally(() => {
      if (!active || requestVersion !== requestVersionRef.current) return;
      setLoading(false);
      const waiters = refreshWaitersRef.current.splice(0);
      for (const resolve of waiters) resolve();
    });

    return () => {
      active = false;
    };
  }, [cursorId, cursorKind, cursorQueryKey, cursorUpdatedAt, deferredQuery, favoritesOnly, lifecycle, reloadToken, subjectKind]);

  useEffect(() => {
    if (pendingDelete) permanentDeleteButtonRef.current?.focus();
  }, [pendingDelete]);

  const visibleSubjects = subjects;
  const pendingDeleteIsCandidate = pendingDelete ? isCandidateSetRecord(pendingDelete) : false;
  const busy = mutation !== null;
  const hasPreviousPage = pageIndex > 0;

  const goToPreviousPage = () => {
    if (!hasPreviousPage || loading || busy) return;
    setEditingSubject(null);
    setPendingDelete(null);
    setPageIndex((current) => Math.max(0, current - 1));
  };

  const goToNextPage = () => {
    if (!nextCursor || loading || busy) return;
    setEditingSubject(null);
    setPendingDelete(null);
    setPageCursors((current) => {
      const next = current.slice(0, pageIndex + 1);
      next[pageIndex + 1] = nextCursor;
      return next;
    });
    setPageIndex((current) => current + 1);
  };

  const saveCurrentView = async () => {
    setResearchError(null);
    setViewMessage(null);
    try {
      if (subjectKind === "all") throw new Error("保存视图前请明确选择“正式命盘”或“候选组”；两类主体不会被合并成一个模糊查询。");
      const baseQuery = subjectKind === "cases"
        ? createDefaultResearchQuery("cases")
        : createDefaultResearchQuery("candidate_sets");
      const saved = await researchRepository.createSavedView({
        name: viewName.trim() || `检索：${query.trim() || "全部案例"}`,
        query: {
          ...baseQuery,
          text: normalizeResearchQueryText(query),
          lifecycle: scope === "trash" ? "trashed" : "active",
          favorites: scope === "favorites" ? "only" : "any"
        }
      });
      setViewName("");
      setViewMessage(`已保存视图“${saved.name}”。`);
      await refreshViews();
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法保存视图。");
    }
  };

  const applySavedView = async (view: SavedViewRecord) => {
    setResearchError(null);
    try {
      if (view.state === "migration_required") {
        throw new Error("该旧版视图需要先在专业研究检索中人工审核迁移，不能直接执行。");
      }
      const target = simpleLibraryTarget(view);
      if (!target) throw new Error("该视图含案例库无法无损表达的高级条件，请到专业研究检索中精确恢复。");
      setQuery(view.query.text);
      setScope(target.libraryScope);
      setSubjectKind(target.subjectKind);
      setSubjects((current) => current.filter((subject) =>
        matchesImmediateLibraryFilter(subject, target.libraryScope, target.subjectKind)
      ));
      setLoading(true);
      resetPagination();
      setViewMessage(`已恢复视图“${view.name}”。`);
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法恢复保存视图。");
    }
  };

  const deleteSavedView = async (view: SavedViewRecord) => {
    setResearchError(null);
    try {
      await researchRepository.deleteSavedView(view.id);
      setViewMessage(`已删除视图“${view.name}”。`);
      await refreshViews();
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法删除保存视图。");
    }
  };

  const changeScope = (nextScope: LibraryScope) => {
    if (busy || nextScope === scope) return;
    setScope(nextScope);
    setSubjects((current) => current.filter((subject) =>
      matchesImmediateLibraryFilter(subject, nextScope, subjectKind)
    ));
    setLoading(true);
    resetPagination();
    setResearchError(null);
    setViewMessage(null);
  };

  const returnFocusToEditButton = (subjectId: string) => {
    window.setTimeout(() => editButtonRefs.current.get(subjectId)?.focus(), 0);
  };

  const returnFocusToScopeButton = (targetScope: LibraryScope) => {
    window.setTimeout(() => scopeButtonRefs.current.get(targetScope)?.focus(), 0);
  };

  const cancelMetadataEdit = () => {
    const subjectId = editingSubject?.id;
    setEditingSubject(null);
    if (subjectId) returnFocusToEditButton(subjectId);
  };

  const saveMetadata = async (subject: ResearchSubjectRecord, patch: MetadataPatch) => {
    setMutation({ subjectId: subject.id, action: "metadata" });
    setResearchError(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.updateCandidateSetMetadata(subject.id, patch);
      } else {
        await caseRepository.updateCaseMetadata(subject.id, patch);
      }
      setEditingSubject(null);
      await refresh();
      setViewMessage(`已更新${subjectTypeLabel(subject)}“${patch.alias}”的别名、标签和备注。`);
      returnFocusToEditButton(subject.id);
    } finally {
      setMutation(null);
    }
  };

  const toggleFavorite = async (subject: ResearchSubjectRecord) => {
    const favorite = !subject.favorite;
    setMutation({ subjectId: subject.id, action: "favorite" });
    setResearchError(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.setCandidateSetFavorite(subject.id, favorite);
      } else {
        await caseRepository.setCaseFavorite(subject.id, favorite);
      }
      await refresh();
      setViewMessage(`已${favorite ? "收藏" : "取消收藏"}${subjectTypeLabel(subject)}“${subject.alias}”。`);
      if (scope === "favorites" && !favorite) returnFocusToScopeButton("favorites");
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法更新收藏状态。");
    } finally {
      setMutation(null);
    }
  };

  const trashSubject = async (subject: ResearchSubjectRecord) => {
    setMutation({ subjectId: subject.id, action: "trash" });
    setResearchError(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.trashCandidateSet(subject.id);
      } else {
        await caseRepository.trashCase(subject.id);
      }
      if (editingSubject?.id === subject.id) setEditingSubject(null);
      await refresh();
      setViewMessage(`已将${subjectTypeLabel(subject)}“${subject.alias}”移入回收站，可在回收站恢复。`);
      returnFocusToScopeButton(scope);
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法移入回收站。");
    } finally {
      setMutation(null);
    }
  };

  const restoreSubject = async (subject: ResearchSubjectRecord) => {
    setMutation({ subjectId: subject.id, action: "restore" });
    setResearchError(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.restoreCandidateSet(subject.id);
      } else {
        await caseRepository.restoreCase(subject.id);
      }
      await refresh();
      setViewMessage(`已恢复${subjectTypeLabel(subject)}“${subject.alias}”。`);
      returnFocusToScopeButton("trash");
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法从回收站恢复。");
    } finally {
      setMutation(null);
    }
  };

  const openPermanentDelete = (subject: ResearchSubjectRecord, trigger: HTMLButtonElement) => {
    if (!subject.deletedAt) {
      setResearchError("只有回收站中的记录才能永久删除。");
      return;
    }
    deleteReturnFocusRef.current = trigger;
    setPendingDelete(subject);
    setResearchError(null);
  };

  const cancelPermanentDelete = () => {
    const trigger = deleteReturnFocusRef.current;
    setPendingDelete(null);
    window.setTimeout(() => trigger?.focus(), 0);
  };

  const confirmPermanentDelete = async () => {
    if (!pendingDelete?.deletedAt) return;
    const subject = pendingDelete;
    setMutation({ subjectId: subject.id, action: "delete" });
    setResearchError(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.deleteCandidateSet(subject.id);
      } else {
        await caseRepository.deleteCase(subject.id);
      }
      setPendingDelete(null);
      await refresh();
      setViewMessage(isCandidateSetRecord(subject)
        ? `已永久删除候选组“${subject.alias}”及其笔记和事件；此操作不可恢复。`
        : `已永久删除案例“${subject.alias}”及其修订、笔记和事件；此操作不可恢复。`);
      returnFocusToScopeButton("trash");
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "无法永久删除研究记录。");
    } finally {
      setMutation(null);
    }
  };

  const emptyTitle = query.trim()
    ? "没有匹配的研究记录"
    : scope === "favorites"
      ? "还没有收藏记录"
      : scope === "trash"
        ? "回收站为空"
        : "案例库还是空的";
  const emptyDescription = query.trim()
    ? "当前关键词在这个范围内没有命中；可缩短关键词或切换“全部 / 收藏 / 回收站”。"
    : scope === "favorites"
      ? "在“全部”中点击星标，即可把正式命盘或未知时辰候选组加入收藏。"
      : scope === "trash"
        ? "从“全部”移入回收站的记录会出现在这里，恢复前不会参与普通检索和选择。"
        : "保存正式命盘或未知时辰候选组后，它们会统一出现在这里。";

  return (
    <div className="page">
      <PageHeading
        eyebrow="Case library"
        title="案例库"
        description="统一管理正式命盘与未知时辰候选组；收藏常用记录，编辑研究元数据，并通过可恢复的回收站完成安全删除。"
        actions={<><AppLink href="/cases/research" className="secondary-action"><Search aria-hidden="true" />专业研究检索</AppLink><AppLink href="/new" className="primary-action"><FilePlus2 aria-hidden="true" />新建排盘</AppLink></>}
      />
      <CsvCaseImporter onImported={refresh} />

      <div className="library-scope-row">
        <div className="library-scope-tabs" role="group" aria-label="案例库范围">
          {libraryScopes.map((item) => (
            <button
              key={item.id}
              ref={(node) => {
                if (node) scopeButtonRefs.current.set(item.id, node);
                else scopeButtonRefs.current.delete(item.id);
              }}
              type="button"
              aria-pressed={scope === item.id}
              title={item.help}
              disabled={busy}
              onClick={() => changeScope(item.id)}
            >
              {item.id === "favorites" ? <Star aria-hidden="true" /> : item.id === "trash" ? <Trash2 aria-hidden="true" /> : null}
              {item.label}
            </button>
          ))}
        </div>
        <p>{libraryScopes.find((item) => item.id === scope)?.help}</p>
      </div>

      <div className="library-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索案例与研究笔记</span>
          <input value={query} onChange={(event) => {
            setQuery(event.target.value);
            resetPagination();
          }} placeholder={scope === "trash" ? "在回收站搜索别名、标签或研究笔记" : "搜索别名、标签或研究笔记"} />
        </label>
        <label className="library-subject-kind"><span>主体类型</span><select value={subjectKind} onChange={(event) => {
          const nextKind = event.target.value as SubjectKind;
          setSubjectKind(nextKind);
          setSubjects((current) => current.filter((subject) =>
            matchesImmediateLibraryFilter(subject, scope, nextKind)
          ));
          setLoading(true);
          resetPagination();
        }}><option value="all">全部主体</option><option value="cases">正式命盘</option><option value="candidate_sets">候选组</option></select></label>
        <StatusPill>{searching ? "检索中" : `本页 ${visibleSubjects.length} · 共 ${total} 条`}</StatusPill>
      </div>

      <section className="saved-view-bar" aria-label="保存视图">
        <div className="saved-view-create"><input value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="视图名称（可选）" /><button type="button" className="secondary-action" disabled={subjectKind === "all"} title={subjectKind === "all" ? "请先在主体类型中选择正式命盘或候选组" : undefined} onClick={() => void saveCurrentView()}><BookmarkPlus aria-hidden="true" />保存当前查询</button></div>
        {savedViews.length ? <div className="saved-view-list">{savedViews.map((view) => {
          const applicable = simpleLibraryTarget(view) !== null;
          const hint = view.state === "migration_required"
            ? "旧版视图待人工审核迁移"
            : applicable ? "在案例库恢复关键词与范围" : "请到专业研究检索打开";
          return <span key={view.id}>{applicable
            ? <button type="button" title={hint} onClick={() => void applySavedView(view)}>{view.name}</button>
            : <AppLink title={hint} href={`/cases/research?view=${encodeURIComponent(view.id)}`}>{view.name} · 专业</AppLink>}
          <button type="button" className="icon-button" aria-label={`删除视图 ${view.name}`} onClick={() => void deleteSavedView(view)}><Trash2 aria-hidden="true" /></button></span>;
        })}</div> : <small>还没有保存视图。</small>}
        <small>保存前必须明确选择正式命盘或候选组，并保留关键词与“全部 / 收藏 / 回收站”范围；组合命理、事件与知识资料条件请使用“专业研究检索”。</small>
      </section>

      {viewMessage ? <p className="success-message" role="status">{viewMessage}</p> : null}
      {pendingDelete ? (
        <section
          className="danger-confirm"
          role="group"
          aria-labelledby="delete-case-title"
          aria-describedby="delete-case-description"
          onKeyDown={(event) => {
            if (event.key === "Escape" && mutation?.action !== "delete") cancelPermanentDelete();
          }}
        >
          <div>
            <strong id="delete-case-title">永久删除“{pendingDelete.alias}”？</strong>
            <p id="delete-case-description">{pendingDeleteIsCandidate
              ? "该候选组及其研究笔记和事件会在一个事务中永久删除。此操作不可恢复，也不能通过回收站撤销。"
              : "该案例的所有 Revision、研究笔记和事件会在一个事务中永久删除。此操作不可恢复，也不能通过回收站撤销；如需保留，请先做全量备份。"}</p>
          </div>
          <div className="backup-actions">
            <button ref={permanentDeleteButtonRef} type="button" className="danger-action" disabled={mutation?.action === "delete"} onClick={() => void confirmPermanentDelete()}>{mutation?.action === "delete" ? "正在永久删除" : pendingDeleteIsCandidate ? "永久删除候选组" : "永久删除案例"}</button>
            <button type="button" className="secondary-action" disabled={mutation?.action === "delete"} onClick={cancelPermanentDelete}>取消</button>
          </div>
        </section>
      ) : null}
      {error || researchError ? <div className="error-panel" role="alert"><strong>无法读取或更新案例库</strong><p>{error ?? researchError}</p></div> : null}
      {loading && !visibleSubjects.length ? <div className="table-skeleton" role="status" aria-label="正在读取案例库" /> : null}
      {!loading && !visibleSubjects.length ? (
        <div className="empty-list">
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          {scope === "all" && !query.trim() && total === 0 ? <AppLink href="/new?demo=1" className="secondary-action">用演示值建立案例</AppLink> : null}
        </div>
      ) : null}
      {visibleSubjects.length ? (
        <div className="case-table-wrap">
          <table className="case-table" aria-busy={busy || searching || undefined}>
            <thead><tr><th>研究记录</th><th>标签</th><th>研究命中</th><th>结构</th><th>最近更新</th><th><span className="sr-only">操作</span></th></tr></thead>
            <tbody>
              {visibleSubjects.map((item) => {
                const isCandidate = isCandidateSetRecord(item);
                const href = isCandidate
                  ? `/candidate-sets/${item.id}`
                  : `/cases/${item.id}/revisions/${item.latestRevisionId}`;
                const matchingNotes = noteMatches.get(item.id) ?? 0;
                const itemBusy = mutation?.subjectId === item.id;
                const editorOpen = editingSubject?.id === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className={item.deletedAt ? "is-trashed" : ""}>
                      <td data-label="研究记录"><strong>{item.alias}</strong><small>{isCandidate ? "时辰待考" : "正式命盘"} · 本地匿名编号 {item.id.slice(0, 8)}{item.favorite ? " · 已收藏" : ""}</small></td>
                      <td data-label="标签">{item.tags.length ? item.tags.join("、") : "—"}</td>
                      <td data-label="研究命中">{deferredQuery.trim() ? <StatusPill tone={matchingNotes ? "jade" : "neutral"}>{matchingNotes ? `${matchingNotes} 条笔记` : "记录字段"}</StatusPill> : <StatusPill tone={isCandidate ? "warning" : "jade"}>{item.deletedAt ? "回收站" : isCandidate ? "时辰待考" : "正式命盘"}</StatusPill>}</td>
                      <td data-label="结构">{isCandidate ? `${item.candidateSet.candidates.length} 个候选` : `${item.revisionCount} 次修订`}</td>
                      <td data-label="更新">{formatDateTime(item.updatedAt)}</td>
                      <td>
                        <div className="case-row-actions">
                          {scope === "trash" ? (
                            <>
                              <button type="button" className="icon-button" disabled={busy} aria-label={`恢复${isCandidate ? "候选组" : "案例"} ${item.alias}`} onClick={() => void restoreSubject(item)}>{itemBusy && mutation?.action === "restore" ? <span className="button-busy-dot" /> : <RotateCcw aria-hidden="true" />}</button>
                              <button type="button" className="icon-button case-permanent-delete" disabled={busy} aria-label={`永久删除${isCandidate ? "候选组" : "案例"} ${item.alias}`} onClick={(event) => openPermanentDelete(item, event.currentTarget)}><Trash2 aria-hidden="true" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" className={`icon-button case-favorite-action${item.favorite ? " is-active" : ""}`} disabled={busy} aria-pressed={item.favorite} aria-label={`${item.favorite ? "取消收藏" : "收藏"}${isCandidate ? "候选组" : "案例"} ${item.alias}`} onClick={() => void toggleFavorite(item)}>{itemBusy && mutation?.action === "favorite" ? <span className="button-busy-dot" /> : <Star aria-hidden="true" fill={item.favorite ? "currentColor" : "none"} />}</button>
                              <button
                                ref={(node) => {
                                  if (node) editButtonRefs.current.set(item.id, node);
                                  else editButtonRefs.current.delete(item.id);
                                }}
                                type="button"
                                className="icon-button"
                                disabled={busy}
                                aria-label={`编辑${isCandidate ? "候选组" : "案例"} ${item.alias}`}
                                aria-expanded={editorOpen}
                                aria-controls={editorOpen ? `subject-metadata-editor-${item.id}` : undefined}
                                onClick={() => setEditingSubject(editorOpen ? null : item)}
                              >
                                <Pencil aria-hidden="true" />
                              </button>
                              <button type="button" className="icon-button" disabled={busy} aria-label={`移入回收站${isCandidate ? "候选组" : "案例"} ${item.alias}`} onClick={() => void trashSubject(item)}>{itemBusy && mutation?.action === "trash" ? <span className="button-busy-dot" /> : <Trash2 aria-hidden="true" />}</button>
                              <AppLink href={href} className="icon-button" aria-label={`打开 ${item.alias}`}><ArrowRight aria-hidden="true" /></AppLink>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {editorOpen ? (
                      <MetadataEditorRow
                        subject={item}
                        saving={itemBusy && mutation?.action === "metadata"}
                        onCancel={cancelMetadataEdit}
                        onSave={(patch) => saveMetadata(item, patch)}
                      />
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {visibleSubjects.length && total > 0 ? (
        <nav className="case-library-pagination" aria-label="案例库分页">
          <p role="status" aria-live="polite">第 {pageIndex + 1} 页 · 本页 {visibleSubjects.length} 条 · 共 {total} 条</p>
          <div>
            <button type="button" className="secondary-action" disabled={!hasPreviousPage || busy} onClick={goToPreviousPage}>上一页</button>
            <button type="button" className="secondary-action" disabled={!nextCursor || busy} onClick={goToNextPage}>下一页</button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
