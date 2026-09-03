import {
  ArrowRight,
  BookmarkPlus,
  ChevronDown,
  FileUp,
  FilePlus2,
  HardDriveDownload,
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
  ReleaseDatabaseWriteLockedError,
  researchRepository,
  type ResearchSubjectPageCursor
} from "@hakimi/storage";
import { CsvCaseImporter } from "../components/csv-case-importer";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { formatDateTime } from "../lib/format";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./case-library-page.css";

type LibraryScope = "all" | "favorites" | "trash";
type SubjectKind = "all" | "cases" | "candidate_sets";
type SimpleLibraryViewTarget = { libraryScope: LibraryScope; subjectKind: Exclude<SubjectKind, "all"> };

type MetadataPatch = {
  alias: string;
  tags: string[];
  notes: string;
};

type SubjectMutationAction = "favorite" | "metadata" | "trash" | "restore" | "delete";

type SubjectMutation = {
  subjectId: string;
  action: SubjectMutationAction;
};

type SubjectMutationOutcome =
  | "locked"
  | "not_started"
  | "confirmed"
  | "committed_refresh_failed"
  | "commit_unknown";

function subjectMutationWasCommitted(outcome: SubjectMutationOutcome): boolean {
  return outcome === "confirmed" || outcome === "committed_refresh_failed";
}

type MetadataEditorRowProps = {
  subject: ResearchSubjectRecord;
  saving: boolean;
  onCancel: () => void;
  onSave: (patch: MetadataPatch) => Promise<void>;
};

type LoadedLibraryPage = {
  subjects: ResearchSubjectRecord[];
  noteMatches: Map<string, number>;
  total: number;
  nextCursor: ResearchSubjectPageCursor | null;
};

type LibraryRefreshWaiter = {
  resolve: () => void;
  reject: (reason: Error) => void;
};

const libraryScopes: ReadonlyArray<{ id: LibraryScope; label: string; help: string }> = [
  { id: "all", label: "全部", help: "全部未删除记录" },
  { id: "favorites", label: "收藏", help: "仅显示已收藏且未删除的记录" },
  { id: "trash", label: "回收站", help: "已移入回收站的记录" }
];

const CASE_LIBRARY_PAGE_SIZE = 50;
const CASE_LIBRARY_SEARCH_DEBOUNCE_MS = 250;
const CASE_LIBRARY_SEARCH_MAX_LENGTH = 240;
const CASE_LIBRARY_VIEW_NAME_MAX_LENGTH = 120;
const CASE_LIBRARY_TAG_INPUT_MAX_LENGTH = 2_000;
const CASE_LIBRARY_SAVED_VIEW_INDEX_LIMIT = 512;
const CASE_LIBRARY_INITIAL_VISIBLE_SAVED_VIEWS = 12;
const CASE_LIBRARY_SAVED_VIEW_STEP = 12;
const CASE_LIBRARY_BINDING_ID_MAX_LENGTH = 512;
const CASE_LIBRARY_CURSOR_QUERY_KEY_MAX_LENGTH = 4_096;
const CASE_LIBRARY_SUBJECT_TAG_LIMIT = 256;
const UNSAFE_LIBRARY_BINDING_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const UNSAFE_LIBRARY_IDENTIFIER_PATTERN = /[\s/\\?#%\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

const CASE_LIBRARY_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-expert-truth-claimed": "false",
  "data-scientific-validity-claimed": "false",
  "data-public-release-authorized": "false",
  "data-system-share-allowed": "false",
  "data-mutation-mode": "epoch-governed-user-initiated-writes",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed"
} as const;

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

function safeLibraryIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= CASE_LIBRARY_BINDING_ID_MAX_LENGTH
    && value === value.trim()
    && !UNSAFE_LIBRARY_IDENTIFIER_PATTERN.test(value);
}

function safeLibraryBoundText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.length > 0)
    && value === value.trim()
    && !UNSAFE_LIBRARY_BINDING_TEXT_PATTERN.test(value);
}

function assertLibraryCursorIntegrity(cursor: ResearchSubjectPageCursor, label: string): void {
  if (!safeLibraryIdentifier(cursor.id)) throw new Error(`${label}包含无效记录 ID。`);
  if (!safeLibraryBoundText(cursor.kind, 80)) throw new Error(`${label}包含无效记录类型。`);
  if (
    !safeLibraryBoundText(cursor.updatedAt, 64)
    || !Number.isFinite(Date.parse(cursor.updatedAt))
  ) throw new Error(`${label}包含无法解析的更新时间。`);
  if (!safeLibraryBoundText(cursor.queryKey, CASE_LIBRARY_CURSOR_QUERY_KEY_MAX_LENGTH, true)) {
    throw new Error(`${label}包含无效查询绑定键。`);
  }
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function assertSavedViewIndexIntegrity(views: readonly SavedViewRecord[]): void {
  if (!Array.isArray(views)) throw new TypeError("保存视图索引不是列表。");
  if (views.length > CASE_LIBRARY_SAVED_VIEW_INDEX_LIMIT) {
    throw new RangeError(`保存视图索引超过 ${CASE_LIBRARY_SAVED_VIEW_INDEX_LIMIT} 条安全处理上限。`);
  }
  const duplicates = duplicateIds(views.map((view) => view.id));
  if (duplicates.length) throw new Error(`保存视图索引包含 ${duplicates.length} 个重复 ID，已拒绝择一展示。`);
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index]!;
    if (
      !safeLibraryIdentifier(view.id)
      || typeof view.name !== "string"
      || typeof view.updatedAt !== "string"
      || !view.name.trim()
      || view.name !== view.name.trim()
      || !view.updatedAt.trim()
      || view.updatedAt !== view.updatedAt.trim()
    ) {
      throw new TypeError(`保存视图索引第 ${index + 1} 条包含无效或未规范化的 ID、名称或更新时间。`);
    }
    if (view.updatedAt.length > 64 || !Number.isFinite(Date.parse(view.updatedAt))) {
      throw new Error(`保存视图索引第 ${index + 1} 条更新时间无法安全解析。`);
    }
  }
}

function assertLibraryPageIntegrity(
  page: LoadedLibraryPage,
  scope: LibraryScope,
  kind: SubjectKind,
  currentCursor: ResearchSubjectPageCursor | null
): void {
  if (!Array.isArray(page.subjects)) throw new Error("案例分页记录不是列表。");
  if (!(page.noteMatches instanceof Map)) throw new Error("案例分页笔记命中计数不是映射。");
  if (!Number.isSafeInteger(page.total) || page.total < 0 || page.total < page.subjects.length) {
    throw new Error(`分页总数 ${page.total} 与本页 ${page.subjects.length} 条记录不一致。`);
  }
  if (page.subjects.length > CASE_LIBRARY_PAGE_SIZE) {
    throw new Error(`本页返回 ${page.subjects.length} 条记录，超过 ${CASE_LIBRARY_PAGE_SIZE} 条上限。`);
  }
  for (let index = 0; index < page.subjects.length; index += 1) {
    const subject = page.subjects[index]!;
    if (
      !safeLibraryIdentifier(subject.id)
      || typeof subject.alias !== "string"
      || !subject.alias.trim()
      || subject.alias !== subject.alias.trim()
      || !safeLibraryBoundText(subject.updatedAt, 64)
      || !Array.isArray(subject.tags)
      || subject.tags.length > CASE_LIBRARY_SUBJECT_TAG_LIMIT
      || subject.tags.some((tag) => typeof tag !== "string")
    ) {
      throw new Error(`本页第 ${index + 1} 条研究记录包含无效标识、别名、更新时间或标签绑定。`);
    }
    if (!isCandidateSetRecord(subject) && !safeLibraryIdentifier(subject.latestRevisionId)) {
      throw new Error(`正式案例“${subject.alias}”缺少可用于精确入口的 latestRevisionId。`);
    }
  }

  const duplicateSubjectIds = duplicateIds(page.subjects.map((subject) => subject.id));
  if (duplicateSubjectIds.length) {
    throw new Error(`本页包含重复研究记录：${duplicateSubjectIds.join("、")}。`);
  }

  let previousUpdatedAt = Number.POSITIVE_INFINITY;
  const subjectIds = new Set(page.subjects.map((subject) => subject.id));
  for (const subject of page.subjects) {
    if (!matchesImmediateLibraryFilter(subject, scope, kind)) {
      throw new Error(`研究记录“${subject.alias}”不符合当前范围或主体类型。`);
    }
    const updatedAt = Date.parse(subject.updatedAt);
    if (!Number.isFinite(updatedAt)) throw new Error(`研究记录“${subject.alias}”的更新时间无法解析。`);
    if (updatedAt > previousUpdatedAt) throw new Error("本页记录未按更新时间降序返回，已停止展示不稳定分页。");
    previousUpdatedAt = updatedAt;
  }

  for (const [subjectId, count] of page.noteMatches) {
    if (!safeLibraryIdentifier(subjectId)) throw new Error("笔记命中计数包含无效研究记录 ID。");
    if (!subjectIds.has(subjectId)) throw new Error(`笔记命中计数引用了本页之外的记录 ${subjectId}。`);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`记录 ${subjectId} 的笔记命中计数无效。`);
  }
  if (currentCursor) assertLibraryCursorIntegrity(currentCursor, "当前分页游标");
  if (page.nextCursor) assertLibraryCursorIntegrity(page.nextCursor, "下一页游标");
  if (page.nextCursor && !page.subjects.length) {
    throw new Error("空分页返回了下一页游标，已停止可能的游标循环。");
  }
  if (page.nextCursor) {
    const lastSubject = page.subjects[page.subjects.length - 1]!;
    if (
      page.nextCursor.id !== lastSubject.id
      || page.nextCursor.updatedAt !== lastSubject.updatedAt
    ) {
      throw new Error("下一页游标未绑定本页末条记录，已停止不稳定分页。");
    }
    if (currentCursor && page.nextCursor.queryKey !== currentCursor.queryKey) {
      throw new Error("下一页游标切换了查询绑定键，已停止跨查询分页。");
    }
  }
  if (
    page.nextCursor && currentCursor &&
    page.nextCursor.id === currentCursor.id &&
    page.nextCursor.kind === currentCursor.kind &&
    page.nextCursor.updatedAt === currentCursor.updatedAt &&
    page.nextCursor.queryKey === currentCursor.queryKey
  ) {
    throw new Error("下一页游标与当前游标相同，已停止分页循环。");
  }
}

function MetadataEditorRow({ subject, saving, onCancel, onSave }: MetadataEditorRowProps) {
  const editorId = `subject-metadata-editor-${subject.id}`;
  const headingId = `${editorId}-title`;
  const errorId = `${editorId}-error`;
  const visibleSubjectAlias = safeLibraryText(subject.alias, "未命名记录", 240);
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
    if (saving) return;
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
    if (tags.length > CASE_LIBRARY_TAG_INPUT_MAX_LENGTH) {
      setError(`标签输入最多 ${CASE_LIBRARY_TAG_INPUT_MAX_LENGTH.toLocaleString("zh-CN")} 个字符。`);
      setInvalidField("tags");
      tagsRef.current?.focus();
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
      setError(safeLibraryText(reason, "无法保存案例资料。"));
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
              <h3 id={headingId}>编辑“{visibleSubjectAlias}”</h3>
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
                disabled={saving}
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
                disabled={saving}
                placeholder="用逗号分隔"
                maxLength={CASE_LIBRARY_TAG_INPUT_MAX_LENGTH}
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
                disabled={saving}
                rows={4}
                maxLength={20_000}
                aria-invalid={invalidField === "notes" || undefined}
                aria-describedby={invalidField === "notes" && error ? errorId : undefined}
              />
            </label>
          </div>
          {error ? <div className="inline-error case-editor-error" id={errorId} role="alert"><strong>还不能保存</strong><p>{safeLibraryText(error, "无法保存案例资料。")}</p></div> : null}
          <div className="case-editor-actions">
            <button type="submit" className="primary-action" disabled={saving} aria-busy={saving}><Save aria-hidden="true" />{saving ? "正在保存" : "保存资料"}</button>
            <button type="button" className="secondary-action" disabled={saving} onClick={onCancel}><X aria-hidden="true" />取消</button>
            <small>按 Esc 可取消编辑；出生资料与历史 Revision 不会被改写。</small>
          </div>
        </form>
      </td>
    </tr>
  );
}

function safeLibraryText(value: unknown, fallback: string, maxLength = 900): string {
  const resolvedFallback = fallback || "案例库操作未完成。";
  const candidate = value instanceof Error
    ? safeVisibleErrorMessage(value, resolvedFallback)
    : value;
  return safeVisibleText(candidate, resolvedFallback, maxLength);
}

function libraryTagsCaption(values: readonly string[]): string {
  const visible = values
    .slice(0, 8)
    .map((value) => safeVisibleText(value, "", 80))
    .filter(Boolean);
  if (!visible.length) return "—";
  const remaining = Math.max(0, values.length - visible.length);
  return `${visible.join("、")}${remaining ? ` · 另 ${remaining} 项` : ""}`;
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
  const [noteMatches, setNoteMatches] = useState(() => new Map<string, number>());
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState<Array<ResearchSubjectPageCursor | null>>(() => [null]);
  const [nextCursor, setNextCursor] = useState<ResearchSubjectPageCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [savedViewsLoading, setSavedViewsLoading] = useState(true);
  const [savedViewsError, setSavedViewsError] = useState<string | null>(null);
  const [viewActionError, setViewActionError] = useState<string | null>(null);
  const [viewMutation, setViewMutation] = useState<"save" | `delete:${string}` | null>(null);
  const [viewMutationReconciliationRequired, setViewMutationReconciliationRequired] = useState(false);
  const [savedViewRenderLimit, setSavedViewRenderLimit] = useState(CASE_LIBRARY_INITIAL_VISIBLE_SAVED_VIEWS);
  const [viewName, setViewName] = useState("");
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<ResearchSubjectRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResearchSubjectRecord | null>(null);
  const [mutation, setMutation] = useState<SubjectMutation | null>(null);
  const [caseImportInFlight, setCaseImportInFlight] = useState(false);
  const [caseImportDrawerOpen, setCaseImportDrawerOpen] = useState(() => (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("import") === "csv"
  ));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const scopeButtonRefs = useRef(new Map<LibraryScope, HTMLButtonElement>());
  const deleteReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null);
  const requestVersionRef = useRef(0);
  const savedViewsRequestVersionRef = useRef(0);
  const refreshWaitersRef = useRef<LibraryRefreshWaiter[]>([]);
  const viewMutationInFlightRef = useRef(false);
  const mutationInFlightRef = useRef(false);
  const caseImportInFlightRef = useRef(false);
  const subjectMutationReconciliationRequiredRef = useRef(false);
  const currentCursor = pageCursors[pageIndex] ?? null;
  const cursorUpdatedAt = currentCursor?.updatedAt ?? "";
  const cursorId = currentCursor?.id ?? "";
  const cursorKind = currentCursor?.kind ?? "";
  const cursorQueryKey = currentCursor?.queryKey ?? "";
  const queryIsSettling = query !== debouncedQuery || debouncedQuery !== deferredQuery;
  const listBusy = loading || queryIsSettling;
  const searching = (Boolean(deferredQuery.trim()) && loading) || queryIsSettling;

  const resetPagination = useCallback(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setEditingSubject(null);
    setPendingDelete(null);
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      refreshWaitersRef.current.push({ resolve, reject });
      resetPagination();
      setReloadToken((current) => current + 1);
    });
  }, [resetPagination]);

  const refreshViews = useCallback(async (propagateFailure = false) => {
    const requestVersion = savedViewsRequestVersionRef.current + 1;
    savedViewsRequestVersionRef.current = requestVersion;
    setSavedViewsLoading(true);
    setSavedViewsError(null);
    try {
      const records = await researchRepository.listSavedViews();
      if (requestVersion !== savedViewsRequestVersionRef.current) return;
      assertSavedViewIndexIntegrity(records);
      setSavedViews([...records].sort((left, right) => (
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.id.localeCompare(right.id)
      )));
      setSavedViewRenderLimit(CASE_LIBRARY_INITIAL_VISIBLE_SAVED_VIEWS);
      setViewMutationReconciliationRequired(false);
      setViewActionError(null);
    } catch (reason) {
      if (requestVersion !== savedViewsRequestVersionRef.current) return;
      const message = safeLibraryText(reason, "无法读取保存视图。");
      setSavedViewsError(message);
      if (propagateFailure) throw new Error(message);
    } finally {
      if (requestVersion === savedViewsRequestVersionRef.current) setSavedViewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshViews();
    return () => {
      savedViewsRequestVersionRef.current += 1;
      requestVersionRef.current += 1;
      const waiters = refreshWaitersRef.current.splice(0);
      const reason = new Error("案例库页面已离开，无法确认刷新后的索引快照。");
      for (const waiter of waiters) waiter.reject(reason);
    };
  }, [refreshViews]);

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    let active = true;
    let loadFailure: Error | null = null;
    const normalized = deferredQuery.trim();
    setLoading(true);
    setError(null);

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
      assertLibraryPageIntegrity(page, scope, subjectKind, currentCursor);
      setSubjects(page.subjects);
      setNoteMatches(page.noteMatches);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    }).catch((reason: unknown) => {
      if (!active || requestVersion !== requestVersionRef.current) return;
      loadFailure = new Error(safeLibraryText(
        reason,
        normalized ? "研究检索失败。" : "无法读取本地研究记录分页。"
      ));
      setSubjects([]);
      setNoteMatches(new Map());
      setTotal(0);
      setNextCursor(null);
      setEditingSubject(null);
      setPendingDelete(null);
      setError(loadFailure.message);
    }).finally(() => {
      if (!active || requestVersion !== requestVersionRef.current) return;
      setLoading(false);
      const waiters = refreshWaitersRef.current.splice(0);
      for (const waiter of waiters) {
        if (loadFailure) waiter.reject(loadFailure);
        else waiter.resolve();
      }
    });

    return () => {
      active = false;
    };
  }, [cursorId, cursorKind, cursorQueryKey, cursorUpdatedAt, deferredQuery, favoritesOnly, lifecycle, reloadToken, subjectKind]);

  useEffect(() => {
    if (!pendingDelete) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    deleteCancelButtonRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [pendingDelete]);

  const visibleSubjects = subjects;
  const visibleSavedViews = savedViews.slice(0, savedViewRenderLimit);
  const pendingDeleteIsCandidate = pendingDelete ? isCandidateSetRecord(pendingDelete) : false;
  const busy = mutation !== null || pendingDelete !== null || caseImportInFlight;
  const interactionBusy = busy || viewMutation !== null;
  const writeReconciliationRequired = subjectMutationReconciliationRequiredRef.current || viewMutationReconciliationRequired;
  const hasPreviousPage = pageIndex > 0;
  const activeScope = libraryScopes.find((item) => item.id === scope);
  const scopeLabel = activeScope?.label ?? scope;
  const scopeHelp = activeScope?.help ?? "当前案例库范围";
  const subjectKindLabel = subjectKind === "cases"
    ? "正式命盘"
    : subjectKind === "candidate_sets"
      ? "候选组"
      : "全部主体";
  const appliedQuery = deferredQuery.trim();
  const visibleAppliedQuery = appliedQuery
    ? safeLibraryText(appliedQuery, "关键词不可显示", 240)
    : "未限定";
  const caseImportGateState = caseImportInFlight
    ? "importing"
    : listBusy
      ? "refreshing"
      : writeReconciliationRequired
        ? "reconcile"
        : interactionBusy
          ? "occupied"
          : "ready";

  const beginSubjectMutation = (subjectId: string, action: SubjectMutationAction): boolean => {
    if (viewMutationReconciliationRequired) {
      setResearchError("保存视图写入结果仍等待完整索引重新读取；为避免跨资料写入，请先重新读取保存视图并解除锁定。");
      return false;
    }
    if (mutationInFlightRef.current || viewMutationInFlightRef.current) return false;
    mutationInFlightRef.current = true;
    setMutation({ subjectId, action });
    return true;
  };

  const finishSubjectMutation = () => {
    mutationInFlightRef.current = false;
    setMutation(null);
  };

  const acquireCaseImportMutation = (): boolean => {
    if (writeReconciliationRequired) {
      setResearchError("上一次案例或保存视图写入结果仍等待重新读取，CSV 导入未取得写锁。请先解除对应锁定。");
      return false;
    }
    if (
      listBusy || interactionBusy || mutationInFlightRef.current ||
      viewMutationInFlightRef.current || caseImportInFlightRef.current
    ) {
      return false;
    }
    caseImportInFlightRef.current = true;
    mutationInFlightRef.current = true;
    setCaseImportInFlight(true);
    setResearchError(null);
    setViewMessage(null);
    return true;
  };

  const releaseCaseImportMutation = () => {
    if (!caseImportInFlightRef.current) return;
    caseImportInFlightRef.current = false;
    mutationInFlightRef.current = false;
    setCaseImportInFlight(false);
  };

  const refreshAfterCaseImport = async () => {
    try {
      await refresh();
      subjectMutationReconciliationRequiredRef.current = false;
      setViewMessage("CSV 写入后的案例索引已重新读取；记录是否出现在当前页仍取决于范围、检索条件与分页位置。");
    } catch (reason) {
      subjectMutationReconciliationRequiredRef.current = true;
      const detail = safeLibraryText(reason, "无法确认刷新后的案例索引快照。");
      setResearchError(safeLibraryText(
        `CSV 写入可能已经完成，但案例库列表重新读取失败：${detail}。不要重复提交；请重新读取并解除锁定。`,
        "CSV 写入后的案例索引无法确认，主体写入入口继续保持锁定。",
        1_200
      ));
      throw new Error(detail);
    }
  };

  const goToPreviousPage = () => {
    if (!hasPreviousPage || listBusy || interactionBusy || mutationInFlightRef.current || viewMutationInFlightRef.current) return;
    setEditingSubject(null);
    setPendingDelete(null);
    setPageIndex(pageIndex - 1);
  };

  const goToNextPage = () => {
    if (!nextCursor || listBusy || interactionBusy || mutationInFlightRef.current || viewMutationInFlightRef.current) return;
    setEditingSubject(null);
    setPendingDelete(null);
    setPageCursors((current) => {
      const next = current.slice(0, pageIndex + 1);
      next[pageIndex + 1] = nextCursor;
      return next;
    });
    setPageIndex(pageIndex + 1);
  };

  const saveCurrentView = async () => {
    if (mutationInFlightRef.current || viewMutationInFlightRef.current || interactionBusy || savedViewsLoading || savedViewsError || writeReconciliationRequired) return;
    viewMutationInFlightRef.current = true;
    setViewMutation("save");
    setViewActionError(null);
    setViewMessage(null);
    let writePhase: "not_started" | "call_started" | "returned" = "not_started";
    try {
      if (subjectKind === "all") throw new Error("保存视图前请明确选择“正式命盘”或“候选组”；两类主体不会被合并成一个模糊查询。");
      const normalizedViewName = viewName.trim();
      if (normalizedViewName.length > CASE_LIBRARY_VIEW_NAME_MAX_LENGTH) {
        throw new Error(`保存视图名称最多 ${CASE_LIBRARY_VIEW_NAME_MAX_LENGTH} 个字符。`);
      }
      const baseQuery = subjectKind === "cases"
        ? createDefaultResearchQuery("cases")
        : createDefaultResearchQuery("candidate_sets");
      const generatedViewName = `检索：${safeLibraryText(query.trim() || "全部案例", "全部案例", 108)}`;
      writePhase = "call_started";
      const saved = await researchRepository.createSavedView({
        name: normalizedViewName || generatedViewName,
        query: {
          ...baseQuery,
          text: normalizeResearchQueryText(query),
          lifecycle: scope === "trash" ? "trashed" : "active",
          favorites: scope === "favorites" ? "only" : "any"
        }
      });
      writePhase = "returned";
      setViewName("");
      setViewMessage(`已保存视图“${saved.name}”。`);
      await refreshViews(true);
    } catch (reason) {
      const detail = safeLibraryText(reason, "无法保存视图。");
      if (writePhase === "call_started") {
        setViewMutationReconciliationRequired(true);
        setViewActionError(`保存视图调用没有返回可核对结果：${detail} 无法证明写入未发生；请勿重复提交，先重新读取完整保存视图索引。`);
      } else if (writePhase === "returned") {
        setViewMutationReconciliationRequired(true);
        setViewActionError(`保存视图已由仓储返回，但完整视图索引未能重新绑定：${detail} 请勿重复提交，先重新读取保存视图。`);
      } else {
        setViewActionError(detail);
      }
    } finally {
      viewMutationInFlightRef.current = false;
      setViewMutation(null);
    }
  };

  const applySavedView = async (view: SavedViewRecord) => {
    if (mutationInFlightRef.current || viewMutationInFlightRef.current || interactionBusy) return;
    setViewActionError(null);
    setViewMessage(null);
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
      setViewActionError(safeLibraryText(reason, "无法恢复保存视图。"));
    }
  };

  const deleteSavedView = async (view: SavedViewRecord) => {
    if (mutationInFlightRef.current || viewMutationInFlightRef.current || interactionBusy || savedViewsLoading || savedViewsError || writeReconciliationRequired) return;
    viewMutationInFlightRef.current = true;
    setViewMutation(`delete:${view.id}`);
    setViewActionError(null);
    setViewMessage(null);
    let writePhase: "call_started" | "returned" = "call_started";
    try {
      await researchRepository.deleteSavedView(view.id);
      writePhase = "returned";
      setViewMessage(`已删除视图“${view.name}”。`);
      await refreshViews(true);
    } catch (reason) {
      const detail = safeLibraryText(reason, "无法删除保存视图。");
      setViewMutationReconciliationRequired(true);
      setViewActionError(writePhase === "call_started"
        ? `删除视图调用没有返回可核对结果：${detail} 无法证明删除未发生；请勿重复提交，先重新读取完整保存视图索引。`
        : `删除视图已由仓储返回，但完整视图索引未能重新绑定：${detail} 请勿重复提交，先重新读取保存视图。`);
    } finally {
      viewMutationInFlightRef.current = false;
      setViewMutation(null);
    }
  };

  const changeScope = (nextScope: LibraryScope) => {
    if (interactionBusy || mutationInFlightRef.current || viewMutationInFlightRef.current || nextScope === scope) return;
    setScope(nextScope);
    setSubjects((current) => current.filter((subject) =>
      matchesImmediateLibraryFilter(subject, nextScope, subjectKind)
    ));
    setLoading(true);
    resetPagination();
    if (!subjectMutationReconciliationRequiredRef.current) setResearchError(null);
    setViewMessage(null);
    setViewActionError(null);
  };

  const clearDismissibleResearchError = () => {
    if (!subjectMutationReconciliationRequiredRef.current) setResearchError(null);
  };

  const updateLibraryQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    clearDismissibleResearchError();
    setViewMessage(null);
    setViewActionError(null);
    resetPagination();
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

  const runCoordinatedSubjectMutation = async ({
    subject,
    action,
    operationLabel,
    committedMessage,
    commit
  }: {
    subject: ResearchSubjectRecord;
    action: SubjectMutationAction;
    operationLabel: string;
    committedMessage: string;
    commit: () => Promise<unknown>;
  }): Promise<SubjectMutationOutcome> => {
    if (subjectMutationReconciliationRequiredRef.current) {
      setResearchError("上一次案例写入尚未完成列表重新读取。为避免对未知或已完成结果重复写入，请先使用“重新读取并解除锁定”。");
      return "locked";
    }
    if (!beginSubjectMutation(subject.id, action)) return "not_started";
    setResearchError(null);
    setViewMessage(null);
    try {
      await commit();
      try {
        await refresh();
        subjectMutationReconciliationRequiredRef.current = false;
        setViewMessage(safeLibraryText(committedMessage, "案例写入已完成。"));
        return "confirmed";
      } catch (reason) {
        subjectMutationReconciliationRequiredRef.current = true;
        setViewMessage(safeLibraryText(committedMessage, "案例写入已完成。"));
        setResearchError(safeLibraryText(
          `${operationLabel}已由本地仓库确认，但案例库列表重新读取失败：${safeLibraryText(reason, "未知错误")}。不要重复提交；请重新读取并解除锁定。`,
          "案例写入已确认，但列表重新读取失败。",
          1_200
        ));
        return "committed_refresh_failed";
      }
    } catch (reason) {
      if (reason instanceof ReleaseDatabaseWriteLockedError) {
        subjectMutationReconciliationRequiredRef.current = false;
        setResearchError(
          "当前页面已进入版本接管写入锁定，本次案例写入未执行；请重新载入后再操作。"
        );
        return "locked";
      }
      subjectMutationReconciliationRequiredRef.current = true;
      setResearchError(safeLibraryText(
        `${operationLabel}结果未知：${safeLibraryText(reason, "本地仓库未返回可确认结果")}。为避免重复写入，主体操作入口已锁定；请先重新读取案例库。`,
        "案例写入结果未知，主体操作入口已锁定。",
        1_200
      ));
      return "commit_unknown";
    } finally {
      finishSubjectMutation();
    }
  };

  const saveMetadata = async (subject: ResearchSubjectRecord, patch: MetadataPatch) => {
    const outcome = await runCoordinatedSubjectMutation({
      subject,
      action: "metadata",
      operationLabel: `更新${subjectTypeLabel(subject)}“${subject.alias}”的研究元数据`,
      committedMessage: `已更新${subjectTypeLabel(subject)}“${patch.alias}”的别名、标签和备注。`,
      commit: () => isCandidateSetRecord(subject)
        ? caseRepository.updateCandidateSetMetadata(subject.id, patch)
        : caseRepository.updateCaseMetadata(subject.id, patch)
    });
    if (subjectMutationWasCommitted(outcome)) {
      setEditingSubject(null);
      returnFocusToEditButton(subject.id);
    }
  };

  const toggleFavorite = async (subject: ResearchSubjectRecord) => {
    const favorite = !subject.favorite;
    const outcome = await runCoordinatedSubjectMutation({
      subject,
      action: "favorite",
      operationLabel: `${favorite ? "收藏" : "取消收藏"}${subjectTypeLabel(subject)}“${subject.alias}”`,
      committedMessage: `已${favorite ? "收藏" : "取消收藏"}${subjectTypeLabel(subject)}“${subject.alias}”。`,
      commit: () => isCandidateSetRecord(subject)
        ? caseRepository.setCandidateSetFavorite(subject.id, favorite)
        : caseRepository.setCaseFavorite(subject.id, favorite)
    });
    if (subjectMutationWasCommitted(outcome) && scope === "favorites" && !favorite) returnFocusToScopeButton("favorites");
  };

  const trashSubject = async (subject: ResearchSubjectRecord) => {
    const outcome = await runCoordinatedSubjectMutation({
      subject,
      action: "trash",
      operationLabel: `将${subjectTypeLabel(subject)}“${subject.alias}”移入回收站`,
      committedMessage: `已将${subjectTypeLabel(subject)}“${subject.alias}”移入回收站，可在回收站恢复。`,
      commit: () => isCandidateSetRecord(subject)
        ? caseRepository.trashCandidateSet(subject.id)
        : caseRepository.trashCase(subject.id)
    });
    if (subjectMutationWasCommitted(outcome)) {
      if (editingSubject?.id === subject.id) setEditingSubject(null);
      returnFocusToScopeButton(scope);
    }
  };

  const restoreSubject = async (subject: ResearchSubjectRecord) => {
    const outcome = await runCoordinatedSubjectMutation({
      subject,
      action: "restore",
      operationLabel: `恢复${subjectTypeLabel(subject)}“${subject.alias}”`,
      committedMessage: `已恢复${subjectTypeLabel(subject)}“${subject.alias}”。`,
      commit: () => isCandidateSetRecord(subject)
        ? caseRepository.restoreCandidateSet(subject.id)
        : caseRepository.restoreCase(subject.id)
    });
    if (subjectMutationWasCommitted(outcome)) returnFocusToScopeButton("trash");
  };

  const openPermanentDelete = (subject: ResearchSubjectRecord, trigger: HTMLButtonElement) => {
    if (mutationInFlightRef.current || viewMutationInFlightRef.current || interactionBusy) return;
    if (subjectMutationReconciliationRequiredRef.current) {
      setResearchError("上一次永久删除尚未完成列表重新读取。为避免对未知或已完成结果重复写入，请先使用“重新读取并解除锁定”。");
      return;
    }
    if (viewMutationReconciliationRequired) {
      setResearchError("保存视图写入结果仍等待完整索引重新读取，永久删除未取得跨资料写锁。");
      return;
    }
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

  const reconcileSubjectMutations = async () => {
    if (interactionBusy || mutationInFlightRef.current || viewMutationInFlightRef.current) return;
    setResearchError(null);
    try {
      await refresh();
      subjectMutationReconciliationRequiredRef.current = false;
      setViewMessage("案例库已重新读取；主体写入入口已按当前仓库状态重新开放。请根据当前列表决定是否需要下一步操作。");
    } catch (reason) {
      subjectMutationReconciliationRequiredRef.current = true;
      setResearchError(safeLibraryText(
        `案例库重新读取失败：${safeLibraryText(reason, "未知错误")}。主体写入入口继续保持锁定。`,
        "案例库重新读取失败，主体写入入口继续保持锁定。",
        1_200
      ));
    }
  };

  const confirmPermanentDelete = async () => {
    if (!pendingDelete?.deletedAt) return;
    const subject = pendingDelete;
    if (!beginSubjectMutation(subject.id, "delete")) return;
    setResearchError(null);
    setViewMessage(null);
    try {
      if (isCandidateSetRecord(subject)) {
        await caseRepository.deleteCandidateSet(subject.id);
      } else {
        await caseRepository.deleteCase(subject.id);
      }
      setPendingDelete(null);
      deleteReturnFocusRef.current = null;
      const committedMessage = isCandidateSetRecord(subject)
        ? `已永久删除候选组“${subject.alias}”及其笔记和事件；此操作不可恢复。`
        : `已永久删除案例“${subject.alias}”及其修订、笔记和事件；此操作不可恢复。`;
      try {
        await refresh();
        subjectMutationReconciliationRequiredRef.current = false;
        setViewMessage(committedMessage);
      } catch (reason) {
        subjectMutationReconciliationRequiredRef.current = true;
        setViewMessage(safeLibraryText(committedMessage, "永久删除已由本地仓库确认。"));
        setResearchError(safeLibraryText(
          `永久删除已由本地仓库确认，但案例库列表重新读取失败：${safeLibraryText(reason, "未知错误")}。不要再次提交删除；请重新读取并解除锁定。`,
          "永久删除已确认，但列表重新读取失败。",
          1_200
        ));
      }
      returnFocusToScopeButton("trash");
    } catch (reason) {
      setPendingDelete(null);
      deleteReturnFocusRef.current = null;
      subjectMutationReconciliationRequiredRef.current = true;
      setResearchError(safeLibraryText(
        `永久删除结果未知：${safeLibraryText(reason, "本地仓库未返回可确认结果")}。为避免重复写入，删除入口已锁定；请先重新读取回收站。`,
        "永久删除结果未知，删除入口已锁定。",
        1_200
      ));
      returnFocusToScopeButton("trash");
    } finally {
      finishSubjectMutation();
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
  const resultStageState = error
    ? "error"
    : listBusy
      ? "loading"
      : visibleSubjects.length
        ? "ready"
        : "empty";
  const resultStageTitle = error
    ? "案例索引暂不可用"
    : listBusy
      ? queryIsSettling ? "正在核对检索结果" : "正在读取案例索引"
      : query.trim()
        ? "关键词命中记录"
        : scope === "favorites"
          ? "收藏研究记录"
          : scope === "trash"
            ? "回收站记录"
            : "本机研究记录";
  const resultStageCaption = error
    ? "未取得可靠计数"
    : listBusy
      ? visibleSubjects.length
        ? "保留上一组已检查记录"
        : "等待分页完整性检查"
      : `${scopeLabel} · ${subjectKindLabel} · ${total.toLocaleString("zh-CN")} 条`;

  return (
    <div
      className="page page--case-library"
      data-scope={scope}
      data-write-reconciliation-required={writeReconciliationRequired}
      data-result-state={resultStageState}
      data-query-settling={queryIsSettling}
      data-page-authority="local-index-and-user-initiated-library-writes"
      {...CASE_LIBRARY_SAFETY_ATTRIBUTES}
    >
      <div className="library-masthead">
        <PageHeading
          eyebrow="Case library"
          title="案例库"
          description="统一管理正式命盘与未知时辰候选组；收藏常用记录，编辑研究元数据，并通过可恢复的回收站完成安全删除。"
          actions={error
            ? <AppLink href="/settings/data" className="secondary-action"><HardDriveDownload aria-hidden="true" />检查本机数据</AppLink>
            : <><AppLink href="/cases/research" className="secondary-action"><Search aria-hidden="true" />专业研究检索</AppLink><AppLink href="/new" className="primary-action"><FilePlus2 aria-hidden="true" />新建排盘</AppLink></>}
        />
        <dl className="library-index-strip" aria-label="当前案例库摘要">
          <div data-state={error ? "unavailable" : listBusy ? "loading" : "ready"}><dt>当前结果</dt><dd>{listBusy ? "读取中" : error ? "不可用" : total}</dd></div>
          <div data-state={error ? "unavailable" : listBusy ? "loading" : "ready"}><dt>本页记录</dt><dd>{error || (listBusy && !visibleSubjects.length) ? "—" : visibleSubjects.length}</dd></div>
          <div data-state={savedViewsError ? "unavailable" : savedViewsLoading ? "loading" : "ready"}>
            <dt>保存视图</dt>
            <dd>{savedViewsLoading ? "读取中" : savedViewsError ? "不可用" : savedViews.length}</dd>
          </div>
        </dl>
      </div>

      {!error ? (
      <details
        className="library-import-drawer"
        data-state={caseImportGateState}
        data-content-mounted={caseImportDrawerOpen}
        open={caseImportDrawerOpen}
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open;
          if (!nextOpen && caseImportInFlightRef.current) {
            event.currentTarget.open = true;
            return;
          }
          setCaseImportDrawerOpen(nextOpen);
        }}
      >
          <summary
            aria-disabled={caseImportInFlight || undefined}
            onClick={(event) => {
              if (caseImportInFlight && caseImportDrawerOpen) event.preventDefault();
            }}
          >
            <FileUp aria-hidden="true" />
            <span><strong>CSV 批量导入</strong><small>映射字段、预检数据，再逐行写入本地案例库</small></span>
            <span className="library-import-state" aria-hidden="true"><small className="is-closed">展开</small><small className="is-open">{caseImportInFlight ? "写入中" : "收起"}</small><ChevronDown /></span>
          </summary>
        {caseImportDrawerOpen ? <div className="library-import-body">
          <div className="library-import-guard" data-state={caseImportGateState} role="status" aria-live="polite">
            <FileUp aria-hidden="true" />
            <span>
               <strong>{caseImportInFlight
                 ? "CSV 批量写入与索引刷新进行中"
                 : listBusy
                   ? "案例列表快照正在刷新"
                    : writeReconciliationRequired
                     ? "上一次案例写入等待重新读取"
                   : interactionBusy
                     ? "其他资料写入正在占用案例库"
                     : "CSV 批量写入通道可用"}</strong>
               <small>{caseImportInFlight
                 ? "共享写锁会持续到刷新结果确认；期间其他案例与保存视图写入均保持关闭。"
                 : listBusy
                   ? "可继续检查已选文件，但新的批量写入会在列表稳定前保持关闭。"
                    : writeReconciliationRequired
                     ? "为避免在未知结果上继续写入，请先使用页面上的“重新读取并解除锁定”。"
                   : interactionBusy
                     ? "当前操作结束后再开始导入，避免交叉写入产生无法归属的回执。"
                     : "开始导入前会同步取得共享写锁，写入后等待案例索引真实刷新再释放。"}</small>
            </span>
          </div>
          <CsvCaseImporter
            onImported={refreshAfterCaseImport}
            acquireMutation={acquireCaseImportMutation}
            releaseMutation={releaseCaseImportMutation}
          />
        </div> : null}
      </details>
      ) : null}

      <section className="library-control-deck" aria-label="案例库检索与筛选">

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
              disabled={interactionBusy}
              onClick={() => changeScope(item.id)}
            >
              {item.id === "favorites" ? <Star aria-hidden="true" /> : item.id === "trash" ? <Trash2 aria-hidden="true" /> : null}
              {item.label}
            </button>
          ))}
        </div>
        <p>{scopeHelp}</p>
      </div>

      <div className="library-toolbar">
        <div className="library-search-control" data-has-query={Boolean(query)}>
          <label className="search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">搜索案例与研究笔记</span>
            <input ref={searchInputRef} type="search" autoComplete="off" enterKeyHint="search" spellCheck={false} value={query} disabled={interactionBusy} maxLength={CASE_LIBRARY_SEARCH_MAX_LENGTH} aria-controls="case-library-results" aria-keyshortcuts="Escape" onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                updateLibraryQuery("");
              }
            }} onChange={(event) => updateLibraryQuery(event.target.value)} placeholder={scope === "trash" ? "在回收站搜索别名、标签或研究笔记" : "搜索别名、标签或研究笔记"} />
          </label>
          {query ? (
            <button
              type="button"
              className="icon-button library-search-clear"
              disabled={interactionBusy}
              aria-label="清除搜索关键词"
              title="清除搜索关键词（Esc）"
              onClick={() => {
                updateLibraryQuery("");
                searchInputRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <label className="library-subject-kind"><span>主体类型</span><select value={subjectKind} disabled={interactionBusy} onChange={(event) => {
          const nextKind = event.target.value as SubjectKind;
          setSubjectKind(nextKind);
          clearDismissibleResearchError();
          setViewMessage(null);
          setViewActionError(null);
          setSubjects((current) => current.filter((subject) =>
            matchesImmediateLibraryFilter(subject, scope, nextKind)
          ));
          setLoading(true);
          resetPagination();
        }}><option value="all">全部主体</option><option value="cases">正式命盘</option><option value="candidate_sets">候选组</option></select></label>
        <StatusPill tone={error ? "cinnabar" : listBusy ? "info" : "neutral"}>{error ? "结果不可用" : searching ? "检索中" : loading ? "读取中" : `本页 ${visibleSubjects.length} · 共 ${total} 条`}</StatusPill>
      </div>

      <section className="library-filter-ledger" data-state={error ? "error" : listBusy ? "loading" : "ready"} aria-label="当前案例库筛选绑定" aria-live="polite">
        <header>
          <div><p className="eyebrow">Filter binding</p><strong>当前筛选与分页</strong></div>
          <StatusPill tone={error ? "cinnabar" : listBusy ? "info" : "neutral"}>{error ? "结果未绑定" : listBusy ? "条件切换中" : "本页结果已绑定"}</StatusPill>
        </header>
        <dl>
          <div><dt>范围</dt><dd>{scopeLabel}</dd></div>
          <div><dt>主体</dt><dd>{subjectKindLabel}</dd></div>
          <div><dt>已应用关键词</dt><dd><code title={appliedQuery ? visibleAppliedQuery : undefined}>{visibleAppliedQuery}</code></dd></div>
          <div><dt>分页</dt><dd>第 {pageIndex + 1} 页 · 每页上限 {CASE_LIBRARY_PAGE_SIZE}</dd></div>
        </dl>
        <p>{error ? "当前条件没有取得可展示结果；计数与列表均不可用于判断空库。" : listBusy ? "新条件尚未完成完整性检查；页面不会把上一组记录计入当前结果。" : "本页已通过数量、筛选范围、排序、重复 ID 与游标检查；这只证明当前分页可展示，不代表全部数据已经人工复核。"}</p>
      </section>

      <section className="saved-view-bar" data-write-state={viewMutationReconciliationRequired ? "reconcile" : viewMutation ? "writing" : "idle"} aria-label="保存视图" aria-busy={savedViewsLoading || viewMutation !== null}>
        <header className="saved-view-heading">
          <div>
            <p className="eyebrow">View shelf</p>
            <strong>检索视图书签</strong>
          </div>
          <span data-state={viewMutationReconciliationRequired ? "reconcile" : savedViewsError ? "unavailable" : savedViewsLoading ? "loading" : "ready"}>
            {viewMutationReconciliationRequired ? "写入待核对" : savedViewsLoading ? "正在读取" : savedViewsError ? "索引不可用" : `${savedViews.length} 个视图`}
          </span>
        </header>
        <div className="saved-view-create">
          <label className="saved-view-name-field">
            <span className="sr-only">保存视图名称（可选）</span>
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="视图名称（可选）"
              maxLength={CASE_LIBRARY_VIEW_NAME_MAX_LENGTH}
              disabled={interactionBusy || savedViewsLoading || Boolean(savedViewsError) || writeReconciliationRequired}
            />
          </label>
          <button
            type="button"
            className="secondary-action"
            disabled={interactionBusy || subjectKind === "all" || savedViewsLoading || Boolean(savedViewsError) || writeReconciliationRequired}
            title={savedViewsLoading
              ? "正在读取保存视图"
              : savedViewsError
                ? "保存视图列表不可用，重试成功后才能写入"
                : subjectKind === "all"
                  ? "请先在主体类型中选择正式命盘或候选组"
                  : undefined}
            onClick={() => void saveCurrentView()}
            aria-busy={viewMutation === "save"}
          >
            {viewMutation === "save" ? <span className="button-busy-dot" aria-hidden="true" /> : <BookmarkPlus aria-hidden="true" />}
            {viewMutation === "save" ? "正在保存" : "保存当前查询"}
          </button>
        </div>
        {savedViewsLoading ? (
          <div className="saved-view-status" role="status">
            <div><strong>正在读取本机保存视图</strong><small>尚未取得可靠计数，不显示空列表结论。</small></div>
          </div>
        ) : savedViewsError ? (
          <div className="saved-view-status is-error" role="alert">
            <div><strong>保存视图列表暂不可用</strong><small>{safeLibraryText(savedViewsError, "无法读取保存视图。")}；现有视图未被清空，创建和删除入口保持关闭。</small></div>
            <button type="button" className="secondary-action" disabled={interactionBusy} onClick={() => void refreshViews()}><RotateCcw aria-hidden="true" />重新读取</button>
          </div>
        ) : savedViews.length ? <>
          <div className="saved-view-list">{visibleSavedViews.map((view) => {
          const applicable = simpleLibraryTarget(view) !== null;
          const hint = view.state === "migration_required"
            ? "旧版视图待人工审核迁移"
            : applicable ? "在案例库恢复关键词与范围" : "请到专业研究检索打开";
          const deleting = viewMutation === `delete:${view.id}`;
          const visibleViewName = safeLibraryText(view.name, "未命名视图", 240);
          return <span key={view.id}>{applicable
            ? <button type="button" title={hint} disabled={interactionBusy} onClick={() => void applySavedView(view)}>{visibleViewName}</button>
            : <AppLink title={hint} href={`/cases/research?view=${encodeURIComponent(view.id)}`}>{visibleViewName} · 专业</AppLink>}
          <button type="button" className="icon-button" disabled={interactionBusy || writeReconciliationRequired} aria-busy={deleting} aria-label={`${deleting ? "正在删除视图" : "删除视图"} ${visibleViewName}`} onClick={() => void deleteSavedView(view)}>{deleting ? <span className="button-busy-dot" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}</button></span>;
        })}</div>
          {savedViews.length > visibleSavedViews.length ? <div className="saved-view-progress"><button type="button" className="secondary-action" onClick={() => setSavedViewRenderLimit((current) => Math.min(current + CASE_LIBRARY_SAVED_VIEW_STEP, savedViews.length))}>继续显示保存视图</button><small role="status" aria-live="polite">已显示 {visibleSavedViews.length} / {savedViews.length} 个视图。</small></div> : null}
        </> : <small>还没有保存视图。</small>}
        {viewActionError ? <div className="saved-view-status is-error" data-reconciliation-required={viewMutationReconciliationRequired} role="alert"><div><strong>{viewMutationReconciliationRequired ? "保存视图写入等待重新读取" : "保存视图操作未完成"}</strong><small>{safeLibraryText(viewActionError, "无法完成保存视图操作。")}</small></div>{viewMutationReconciliationRequired ? <button type="button" className="secondary-action" disabled={interactionBusy || savedViewsLoading} onClick={() => void refreshViews()}><RotateCcw aria-hidden="true" />重新读取并解除锁定</button> : null}</div> : null}
        <small>保存前必须明确选择正式命盘或候选组，并保留关键词与“全部 / 收藏 / 回收站”范围；组合命理、事件与知识资料条件请使用“专业研究检索”。</small>
      </section>
      </section>

      {viewMessage ? <p className="success-message" role="status">{safeLibraryText(viewMessage, "案例库状态已更新。")}</p> : null}
      {researchError ? (
        <div className="library-operation-error" data-reconciliation-required={subjectMutationReconciliationRequiredRef.current} role="alert">
          <div><strong>{subjectMutationReconciliationRequiredRef.current ? "案例操作等待重新读取" : "案例操作未完成"}</strong><p>{safeLibraryText(researchError, "案例操作未完成。", 1_200)}</p></div>
          <div className="button-row">
            {subjectMutationReconciliationRequiredRef.current ? (
              <button type="button" className="secondary-action" disabled={interactionBusy} onClick={() => void reconcileSubjectMutations()}><RotateCcw aria-hidden="true" />重新读取并解除锁定</button>
            ) : null}
            {!subjectMutationReconciliationRequiredRef.current ? (
              <button type="button" className="secondary-action" disabled={interactionBusy} onClick={() => setResearchError(null)}><X aria-hidden="true" />关闭提示</button>
            ) : null}
          </div>
        </div>
      ) : null}
      {pendingDelete ? (
        <div className="danger-confirm-modal" role="presentation">
          <section
            className="danger-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-case-title"
            aria-describedby="delete-case-description"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                if (mutation?.action !== "delete") cancelPermanentDelete();
                return;
              }
              if (event.key !== "Tab") return;
              const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (!first || !last) {
                event.preventDefault();
                event.currentTarget.focus();
                return;
              }
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <div>
              <strong id="delete-case-title">永久删除“{safeLibraryText(pendingDelete.alias, "未命名记录", 240)}”？</strong>
              <p id="delete-case-description">{pendingDeleteIsCandidate
                ? "该候选组及其研究笔记和事件会在一个事务中永久删除。此操作不可恢复，也不能通过回收站撤销。"
                : "该案例的所有 Revision、研究笔记和事件会在一个事务中永久删除。此操作不可恢复，也不能通过回收站撤销；如需保留，请先做全量备份。"}</p>
            </div>
            <div className="backup-actions">
              <button type="button" className="danger-action" disabled={mutation?.action === "delete"} aria-busy={mutation?.action === "delete"} onClick={() => void confirmPermanentDelete()}>{mutation?.action === "delete" ? "正在永久删除" : pendingDeleteIsCandidate ? "永久删除候选组" : "永久删除案例"}</button>
              <button ref={deleteCancelButtonRef} type="button" className="secondary-action" disabled={mutation?.action === "delete"} onClick={cancelPermanentDelete}>取消</button>
            </div>
          </section>
        </div>
      ) : null}
      <section
        id="case-library-results"
        className="library-results-stage"
        data-state={resultStageState}
        aria-labelledby="case-library-results-title"
        aria-busy={listBusy || undefined}
      >
        <header className="library-results-heading">
          <div>
            <p className="eyebrow">Indexed records</p>
            <h2 id="case-library-results-title">{resultStageTitle}</h2>
          </div>
          <span className="library-results-meta" aria-live="polite" aria-atomic="true">{resultStageCaption}</span>
        </header>
      {!loading && error ? (
        <section className="library-unavailable" aria-labelledby="library-unavailable-title">
          <RotateCcw aria-hidden="true" />
          <div>
            <p className="eyebrow">Result unavailable</p>
            <h2 id="library-unavailable-title">没有把读取失败解释成空库</h2>
            <p>当前筛选没有取得可靠结果，因此列表、计数、CSV 导入和新建写入入口均保持关闭。你可以重新读取，或调整范围触发一条新的只读查询。</p>
            <div className="library-unavailable-diagnostic" role="alert">
              <strong>案例索引诊断</strong>
              <p>{safeLibraryText(error, "无法读取本地研究记录。", 1_200)}</p>
            </div>
            <div className="button-row">
              <button type="button" className="secondary-action" onClick={() => void refresh()}><RotateCcw aria-hidden="true" />重新读取</button>
              <AppLink href="/settings/data" className="text-link">检查数据与备份</AppLink>
            </div>
          </div>
        </section>
      ) : null}
      {listBusy && visibleSubjects.length ? (
        <div className="library-retained-results" role="status">
          <RotateCcw aria-hidden="true" />
          <div><strong>{queryIsSettling ? "正在应用新的筛选条件" : "正在重新读取当前分页"}</strong><p>下方暂时保留上一组已通过检查的记录以避免界面跳空；它们不是新条件的结果。写操作已锁定，打开记录仍使用稳定本地 ID。</p></div>
        </div>
      ) : null}
      {listBusy && !visibleSubjects.length ? <div className="table-skeleton" role="status" aria-label="正在读取案例库" /> : null}
      {!listBusy && !error && !visibleSubjects.length ? (
        <div className="empty-list">
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          {scope === "all" && !query.trim() && total === 0 ? <AppLink href="/new?demo=1" className="secondary-action">用演示值建立案例</AppLink> : null}
        </div>
      ) : null}
      {!error && visibleSubjects.length ? (
        <div className="case-table-wrap" role="region" aria-label="案例库研究记录区域" tabIndex={0}>
          <table className="case-table" aria-busy={busy || listBusy || undefined}>
            <caption className="sr-only">{scopeLabel}范围内的{subjectKindLabel}，按最近更新时间降序排列；窄屏自动使用卡片布局。</caption>
            <thead><tr><th scope="col">研究记录</th><th scope="col">标签</th><th scope="col">研究命中</th><th scope="col">结构</th><th scope="col">最近更新</th><th scope="col"><span className="sr-only">操作</span></th></tr></thead>
            <tbody>
              {visibleSubjects.map((item, itemIndex) => {
                const isCandidate = isCandidateSetRecord(item);
                const visibleAlias = safeLibraryText(item.alias, "未命名记录", 240);
                const visibleTags = libraryTagsCaption(item.tags);
                const encodedItemId = encodeURIComponent(item.id);
                const href = isCandidate
                  ? `/candidate-sets/${encodedItemId}`
                  : `/cases/${encodedItemId}/revisions/${encodeURIComponent(item.latestRevisionId ?? "")}`;
                const matchingNotes = noteMatches.get(item.id) ?? 0;
                const itemBusy = mutation?.subjectId === item.id;
                const editorOpen = editingSubject?.id === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className={`${item.deletedAt ? "is-trashed " : ""}${isCandidate ? "is-candidate" : "is-formal"}`}>
                      <td data-label="研究记录" className="case-record-cell">
                        <span className="case-record-index" aria-hidden="true">{String(pageIndex * CASE_LIBRARY_PAGE_SIZE + itemIndex + 1).padStart(2, "0")}</span>
                        <span className="case-record-copy"><strong>{visibleAlias}</strong><small title={`稳定记录 ID：${safeLibraryText(item.id, "不可用", 160)}`}>{isCandidate ? "时辰待考" : "正式命盘"} · 本地匿名编号 {safeLibraryText(item.id.slice(0, 8), "不可用", 24)}{item.favorite ? " · 已收藏" : ""}</small></span>
                      </td>
                      <td data-label="标签">{visibleTags}</td>
                      <td data-label="研究命中">{deferredQuery.trim() ? <StatusPill tone={matchingNotes ? "info" : "neutral"}>{matchingNotes ? `${matchingNotes} 条笔记` : "记录字段"}</StatusPill> : <StatusPill tone={item.deletedAt || isCandidate ? "warning" : "info"}>{item.deletedAt ? "回收站" : isCandidate ? "时辰待考" : "正式命盘"}</StatusPill>}</td>
                      <td data-label="结构">{isCandidate ? `${item.candidateSet.candidates.length} 个候选` : `${item.revisionCount} 次修订`}</td>
                      <td data-label="更新">{formatDateTime(item.updatedAt)}</td>
                      <td data-label="操作">
                        <div className="case-row-actions">
                          {scope === "trash" ? (
                            <>
                              <button type="button" className="icon-button" disabled={interactionBusy || listBusy} aria-busy={itemBusy && mutation?.action === "restore"} aria-label={`${itemBusy && mutation?.action === "restore" ? "正在恢复" : "恢复"}${isCandidate ? "候选组" : "案例"} ${visibleAlias}`} onClick={() => void restoreSubject(item)}>{itemBusy && mutation?.action === "restore" ? <span className="button-busy-dot" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}</button>
                              <button type="button" className="icon-button case-permanent-delete" disabled={interactionBusy || listBusy} aria-label={`永久删除${isCandidate ? "候选组" : "案例"} ${visibleAlias}`} onClick={(event) => openPermanentDelete(item, event.currentTarget)}><Trash2 aria-hidden="true" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" className={`icon-button case-favorite-action${item.favorite ? " is-active" : ""}`} disabled={interactionBusy || listBusy} aria-busy={itemBusy && mutation?.action === "favorite"} aria-pressed={item.favorite} aria-label={`${itemBusy && mutation?.action === "favorite" ? "正在" : ""}${item.favorite ? "取消收藏" : "收藏"}${isCandidate ? "候选组" : "案例"} ${visibleAlias}`} onClick={() => void toggleFavorite(item)}>{itemBusy && mutation?.action === "favorite" ? <span className="button-busy-dot" aria-hidden="true" /> : <Star aria-hidden="true" fill={item.favorite ? "currentColor" : "none"} />}</button>
                              <button
                                ref={(node) => {
                                  if (node) editButtonRefs.current.set(item.id, node);
                                  else editButtonRefs.current.delete(item.id);
                                }}
                                type="button"
                                className="icon-button"
                                disabled={interactionBusy || listBusy}
                                aria-label={`编辑${isCandidate ? "候选组" : "案例"} ${visibleAlias}`}
                                aria-expanded={editorOpen}
                                aria-controls={editorOpen ? `subject-metadata-editor-${item.id}` : undefined}
                                onClick={() => setEditingSubject(editorOpen ? null : item)}
                              >
                                <Pencil aria-hidden="true" />
                              </button>
                              <button type="button" className="icon-button" disabled={interactionBusy || listBusy} aria-busy={itemBusy && mutation?.action === "trash"} aria-label={`${itemBusy && mutation?.action === "trash" ? "正在移入回收站" : "移入回收站"}${isCandidate ? "候选组" : "案例"} ${visibleAlias}`} onClick={() => void trashSubject(item)}>{itemBusy && mutation?.action === "trash" ? <span className="button-busy-dot" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}</button>
                              <AppLink href={href} className="icon-button" aria-label={`打开 ${visibleAlias}`}><ArrowRight aria-hidden="true" /></AppLink>
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
      {!error && visibleSubjects.length && total > 0 ? (
        <nav className="case-library-pagination" aria-label="案例库分页">
          <p role="status" aria-live="polite">第 {pageIndex + 1} 页 · 本页 {visibleSubjects.length} 条 · 共 {total} 条</p>
          <div>
            <button type="button" className="secondary-action" disabled={!hasPreviousPage || listBusy || interactionBusy} onClick={goToPreviousPage}>上一页</button>
            <button type="button" className="secondary-action" disabled={!nextCursor || listBusy || interactionBusy} onClick={goToNextPage}>下一页</button>
          </div>
        </nav>
      ) : null}
      </section>
    </div>
  );
}
