import { ArrowLeft, BookOpenText, FileKey2, FilePlus2, Link2, ListChecks, Printer, Quote, RefreshCw, Search, Trash2, TriangleAlert, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  sourceRightsRecordSchema,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type KnowledgeSection,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { webReportExportPort } from "@hakimi/platform";
import { knowledgeRepository } from "@hakimi/storage";
import { KnowledgeImporter } from "../components/knowledge-importer";
import { EvidenceCoverageReport } from "../components/evidence-coverage-report";
import { PageHeading } from "../components/page-heading";
import { SourceRightsLedger } from "../components/source-rights-ledger";
import { StatusPill } from "../components/status-pill";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import {
  buildKnowledgeSearch,
  parseKnowledgeRoute,
  type KnowledgeCitationTargetContext,
  type KnowledgeRouteState
} from "../lib/knowledge-route";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./knowledge-page.css";

type KnowledgeDocument = KnowledgeDocumentRecord;
type KnowledgeSearchHit = { document: KnowledgeDocumentRecord; sectionId: string; lineNumber: number; excerpt: string };
type Citation = CitationRecord;

const KNOWLEDGE_LINES_PER_PAGE = 400;
const KNOWLEDGE_IMPORTER_PANEL_ID = "knowledge-importer-panel";
const KNOWLEDGE_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });
const LocalSourceAwareReviewPanel = lazy(async () => {
  const module = await import("../components/local-source-aware-review-panel");
  return { default: module.LocalSourceAwareReviewPanel };
});

type KnowledgeMutation = {
  kind: "import-document" | "create-citation" | "delete-citation" | "delete-document";
  subjectId: string;
};

type KnowledgeMutationIssue = {
  certainty: "call_unknown" | "returned_unreconciled";
  mutation: KnowledgeMutation;
  reference: string;
  message: string;
  reconciliationRequested: boolean;
  reconciliationCompleted: boolean;
};

type KnowledgeImportReceipt = {
  documentId: string;
  title: string;
  contentHash: string;
  routeSeen: boolean;
};

function shortKnowledgeId(value: unknown): string {
  return safeVisibleText(value, "不可显示", 160).slice(0, 8);
}

function currentKnowledgeLocationKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function targetLabel(target: KnowledgeCitationTargetContext): string {
  if (target.kind === "research_note") return `研究笔记 ${shortKnowledgeId(target.noteId)}`;
  if (target.kind === "event") return `事件记录 ${shortKnowledgeId(target.eventId)}`;
  if (target.kind === "evidence_subject") return `证据主题 ${safeVisibleText(target.subjectId, "不可显示", 160)}`;
  return `命盘字段 ${safeVisibleText(target.field, "不可显示", 160)}`;
}

function knowledgeMutationLabel(kind: KnowledgeMutation["kind"]): string {
  if (kind === "create-citation") return "建立候选引用";
  if (kind === "delete-citation") return "删除引用";
  if (kind === "delete-document") return "删除资料及关联引用";
  return "导入资料";
}

function targetReturnHref(target: KnowledgeCitationTargetContext): string | null {
  return target.kind === "chart_field"
    ? `/cases/${encodeURIComponent(target.caseId)}/revisions/${encodeURIComponent(target.revisionId)}`
    : null;
}

function targetKey(target: KnowledgeCitationTargetContext | null): string {
  if (!target) return "";
  if (target.kind === "research_note") return `${target.kind}:${target.noteId}`;
  if (target.kind === "event") return `${target.kind}:${target.eventId}`;
  if (target.kind === "evidence_subject") return `${target.kind}:${target.subjectId}`;
  return `${target.kind}:${target.caseId}:${target.revisionId}:${target.field}`;
}

function citationTargetLabel(target: Citation["targets"][number]): string {
  if (target.kind === "research_note") return `研究笔记 ${shortKnowledgeId(target.noteId)}`;
  if (target.kind === "event") return `事件记录 ${shortKnowledgeId(target.eventId)}`;
  if (target.kind === "evidence_subject") return `证据主题 ${safeVisibleText(target.subjectId, "不可显示", 160)}`;
  return `命盘字段 ${safeVisibleText(target.field, "不可显示", 160)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? safeVisibleText(value, "日期不可显示", 80)
    : KNOWLEDGE_DATE_FORMATTER.format(date);
}

function sortKnowledgeCitations(records: readonly Citation[]): Citation[] {
  return [...records].sort((left, right) => {
    const timestampOrder = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (timestampOrder !== 0) return timestampOrder;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

function formatByteSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return "大小不可用";
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MiB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KiB`;
  return `${size} B`;
}

function sourceTraceFieldCount(
  document: KnowledgeDocument,
  sourceRights: SourceRightsRecord | null
): number {
  return [
    document.author,
    document.edition,
    document.sourceNote,
    sourceRights?.source.sourceUrl,
    sourceRights?.source.publisher,
    sourceRights?.source.publicationYear
  ]
    .filter((value) => typeof value === "number"
      ? Number.isSafeInteger(value) && value > 0
      : typeof value === "string" && value.trim().length > 0)
    .length;
}

function safeExternalSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const trimmed = value.trim();
    const visible = safeVisibleText(trimmed, "", 2_048);
    if (!visible || visible !== trimmed) return null;
    const parsed = new URL(visible);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function displayKnowledgeFileName(value: string | null | undefined): string {
  if (!value) return "未登记";
  const segments = value.split(/[\\/]/);
  return safeVisibleText(segments[segments.length - 1], "未登记", 240);
}

function knowledgeIndexIntegrityIssue(
  documents: readonly KnowledgeDocument[],
  hits: readonly KnowledgeSearchHit[]
): string | null {
  if (new Set(documents.map((document) => document.id)).size !== documents.length) {
    return "资料索引包含重复文档 ID，无法建立唯一阅读路由。";
  }
  const documentIndex = new Map(documents.map((document) => [document.id, document]));
  for (const document of documents) {
    if (
      !document.id.trim() ||
      !document.title.trim() ||
      !document.contentHash.trim() ||
      !Number.isSafeInteger(document.byteSize) ||
      document.byteSize <= 0 ||
      !Number.isSafeInteger(document.lineCount) ||
      document.lineCount < 1 ||
      !Number.isFinite(Date.parse(document.updatedAt)) ||
      document.sections.length < 1
    ) {
      return "资料索引包含空身份、无效内容指纹、原件大小、行数、更新时间或章节索引。";
    }
    if (new Set(document.sections.map((section) => section.id)).size !== document.sections.length) {
      return `资料“${document.title}”包含重复章节 ID。`;
    }
    if (document.sections.some((section) => (
      !section.id.trim() ||
      !Number.isSafeInteger(section.startLine) ||
      !Number.isSafeInteger(section.endLine) ||
      section.startLine < 1 ||
      section.endLine < section.startLine ||
      section.endLine > document.lineCount
    ))) {
      return `资料“${document.title}”包含越界或无效章节行号。`;
    }
  }
  const hitKeys = hits.map((hit) => `${hit.document.id}:${hit.sectionId}:${hit.lineNumber}`);
  if (new Set(hitKeys).size !== hitKeys.length) {
    return "全文检索返回了重复定位结果。";
  }
  for (const hit of hits) {
    const canonical = documentIndex.get(hit.document.id);
    if (!canonical || canonical.contentHash !== hit.document.contentHash) {
      return "全文检索命中没有绑定当前资料索引中的同一内容快照。";
    }
    const section = hit.document.sections.find((item) => item.id === hit.sectionId);
    if (!section || hit.lineNumber < section.startLine || hit.lineNumber > section.endLine) {
      return "全文检索命中的章节或行号不属于返回的资料快照。";
    }
  }
  return null;
}

function importedDocumentReadbackIssue(
  created: KnowledgeDocument,
  persisted: KnowledgeDocument | null
): string | null {
  if (!persisted) return "按新文档 ID 回读时没有取得记录。";
  const indexIssue = knowledgeIndexIntegrityIssue([persisted], []);
  if (indexIssue) return indexIssue;
  if (
    persisted.id !== created.id ||
    persisted.contentHash !== created.contentHash ||
    persisted.recordType !== created.recordType ||
    persisted.format !== created.format ||
    persisted.fileName !== created.fileName ||
    persisted.byteSize !== created.byteSize ||
    persisted.lineCount !== created.lineCount
  ) {
    return "回读记录的文档 ID、内容指纹或文件身份与写入返回值不一致。";
  }
  if (
    persisted.title !== created.title ||
    persisted.author !== created.author ||
    persisted.edition !== created.edition ||
    persisted.sourceNote !== created.sourceNote
  ) {
    return "回读记录的标题或来源字段与写入返回值不一致。";
  }
  if (
    persisted.sections.length !== created.sections.length ||
    persisted.sections.some((section, index) => {
      const expected = created.sections[index];
      return !expected ||
        section.id !== expected.id ||
        section.title !== expected.title ||
        section.level !== expected.level ||
        section.startLine !== expected.startLine ||
        section.endLine !== expected.endLine;
    })
  ) {
    return "回读记录的章节索引与写入返回值不一致。";
  }
  return null;
}

function citationIndexIntegrityIssue(records: readonly Citation[], documentId: string): string | null {
  if (new Set(records.map((citation) => citation.id)).size !== records.length) {
    return "引用索引包含重复引用 ID。";
  }
  if (records.some((citation) => citation.documentId !== documentId)) {
    return "引用索引混入了属于其他资料的记录。";
  }
  if (records.some((citation) => (
    !Number.isInteger(citation.locator.startLine) ||
    !Number.isInteger(citation.locator.endLine) ||
    citation.locator.startLine < 1 ||
    citation.locator.endLine < citation.locator.startLine
  ))) {
    return "引用索引包含无效行号范围。";
  }
  if (records.some((citation) => !Number.isFinite(Date.parse(citation.updatedAt)))) {
    return "引用索引包含无效更新时间。";
  }
  return null;
}

function sectionContainingLine(document: KnowledgeDocument, lineNumber: number) {
  return document.sections.find((section) => section.startLine <= lineNumber && section.endLine >= lineNumber) ?? null;
}

function documentHref(
  route: KnowledgeRouteState,
  document: KnowledgeDocument,
  location?: { sectionId?: string; lineNumber?: number; citationId?: string }
): string {
  return `/knowledge${buildKnowledgeSearch({
    query: route.query,
    documentId: document.id,
    sectionId: location?.sectionId,
    lineNumber: location?.lineNumber,
    citationId: location?.citationId,
    target: route.target,
    reviewContextLocator: route.reviewContextLocator
  })}`;
}

function renderKnowledgeLine(rawLine: string, format: KnowledgeDocument["format"], sectionStart: KnowledgeSection | null): { text: string; headingLevel: number | null } {
  if (format !== "markdown" || !sectionStart || sectionStart.level === 0) {
    return { text: rawLine, headingLevel: null };
  }
  return { text: sectionStart.title, headingLevel: sectionStart.level };
}

function accessibleKnowledgeHeadingLevel(markdownLevel: number): number {
  return Math.min(6, markdownLevel + 2);
}

export function KnowledgePage() {
  const documentTitleId = useId();
  const sourceLedgerTitleId = useId();
  const citationEditorId = useId();
  const citationEditorTitleId = useId();
  const mutationIssueTitleId = useId();
  const deleteDocumentTitleId = useId();
  const deleteDocumentDescriptionId = useId();
  const location = useAppLocation();
  const route = useMemo(() => parseKnowledgeRoute(location.search), [location.search]);
  const activeTargetKey = targetKey(route.target);
  const reviewContextRouteKey = route.reviewContextLocator
    ? `${route.reviewContextLocator.caseId}:${route.reviewContextLocator.revisionId}:${route.reviewContextLocator.fieldPath}`
    : "";
  const dataRouteKey = `${route.query}\u0000${route.documentId ?? ""}\u0000${route.citationId ?? ""}`;
  const [queryDraft, setQueryDraft] = useState(route.query);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [hits, setHits] = useState<KnowledgeSearchHit[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [selectedSourceRights, setSelectedSourceRights] = useState<SourceRightsRecord | null>(null);
  const [sourceRightsError, setSourceRightsError] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedRouteKey, setLoadedRouteKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [citationDocumentId, setCitationDocumentId] = useState<string | null>(null);
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [sourceReviewInvalidationToken, setSourceReviewInvalidationToken] = useState(0);
  const [showImporter, setShowImporter] = useState(false);
  const [importReceipt, setImportReceipt] = useState<KnowledgeImportReceipt | null>(null);
  const [citationLine, setCitationLine] = useState<number | null>(null);
  const [annotation, setAnnotation] = useState("");
  const [savingCitation, setSavingCitation] = useState(false);
  const [knowledgeMutation, setKnowledgeMutation] = useState<KnowledgeMutation | null>(null);
  const [mutationIssue, setMutationIssue] = useState<KnowledgeMutationIssue | null>(null);
  const [confirmDeleteDocument, setConfirmDeleteDocument] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const citationEditorHeadingRef = useRef<HTMLHeadingElement>(null);
  const citationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const citationEditorWasOpenRef = useRef(false);
  const deleteDocumentTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteDocumentConfirmRef = useRef<HTMLDivElement>(null);
  const deleteDocumentWasOpenRef = useRef(false);
  const deleteDocumentCloseTargetRef = useRef<"trigger" | "search">("trigger");
  const citationRequestVersionRef = useRef(0);
  const knowledgeMutationRef = useRef<KnowledgeMutation | null>(null);
  const mutationIssueRef = useRef<KnowledgeMutationIssue | null>(null);

  const printCurrentReadingPage = async () => {
    setPrintError(null);
    try {
      await webReportExportPort.printReport();
    } catch (reason) {
      setPrintError(safeVisibleErrorMessage(reason, "当前阅读页未能打开系统打印。"));
    }
  };

  const beginKnowledgeMutation = (mutation: KnowledgeMutation): boolean => {
    if (knowledgeMutationRef.current || mutationIssueRef.current) return false;
    knowledgeMutationRef.current = mutation;
    setSourceReviewInvalidationToken((current) => current + 1);
    setKnowledgeMutation(mutation);
    return true;
  };

  const finishKnowledgeMutation = (mutation: KnowledgeMutation) => {
    if (knowledgeMutationRef.current !== mutation) return;
    knowledgeMutationRef.current = null;
    setKnowledgeMutation(null);
  };

  const lockKnowledgeMutationIssue = (
    issue: Omit<KnowledgeMutationIssue, "reconciliationRequested" | "reconciliationCompleted">
  ) => {
    const nextIssue: KnowledgeMutationIssue = {
      ...issue,
      reconciliationRequested: false,
      reconciliationCompleted: false
    };
    mutationIssueRef.current = nextIssue;
    setMutationIssue(nextIssue);
    setError(null);
    if (issue.mutation.kind === "delete-document") {
      deleteDocumentCloseTargetRef.current = "search";
      setConfirmDeleteDocument(false);
    }
  };

  const requestKnowledgeMutationReconciliation = () => {
    setMutationIssue((current) => {
      if (!current) return current;
      const next = { ...current, reconciliationRequested: true, reconciliationCompleted: false };
      mutationIssueRef.current = next;
      return next;
    });
    setReloadToken((current) => current + 1);
  };

  const acceptKnowledgeMutationReconciliation = () => {
    const issue = mutationIssueRef.current;
    if (!issue?.reconciliationCompleted || knowledgeMutationRef.current) return;
    mutationIssueRef.current = null;
    setMutationIssue(null);
    setError(null);
  };

  const acquireImportMutation = (subjectId: string): (() => void) | null => {
    const mutation: KnowledgeMutation = { kind: "import-document", subjectId };
    if (!beginKnowledgeMutation(mutation)) return null;
    return () => finishKnowledgeMutation(mutation);
  };

  const loadCitationIndex = useCallback((documentId: string | null) => {
    const requestVersion = citationRequestVersionRef.current + 1;
    citationRequestVersionRef.current = requestVersion;
    setCitationDocumentId(documentId);
    setCitations([]);
    setCitationsError(null);
    if (!documentId) {
      setCitationsLoading(false);
      return;
    }
    setCitationsLoading(true);
    void knowledgeRepository.listCitationsByDocument(documentId)
      .then((records) => {
        if (requestVersion !== citationRequestVersionRef.current) return;
        const integrityIssue = citationIndexIntegrityIssue(records, documentId);
        if (integrityIssue) throw new Error(integrityIssue);
        setCitations(sortKnowledgeCitations(records));
      })
      .catch((reason: unknown) => {
        if (requestVersion !== citationRequestVersionRef.current) return;
        setCitationsError(safeVisibleErrorMessage(reason, "无法读取当前资料的引用索引。"));
      })
      .finally(() => {
        if (requestVersion === citationRequestVersionRef.current) setCitationsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (citationLine !== null) {
      citationEditorWasOpenRef.current = true;
      citationEditorHeadingRef.current?.focus();
      return;
    }
    if (!citationEditorWasOpenRef.current) return;
    citationEditorWasOpenRef.current = false;
    if (citationTriggerRef.current?.isConnected) citationTriggerRef.current.focus();
  }, [citationLine]);

  useEffect(() => {
    if (confirmDeleteDocument) {
      deleteDocumentWasOpenRef.current = true;
      deleteDocumentConfirmRef.current?.focus();
      return;
    }
    if (!deleteDocumentWasOpenRef.current) return;
    deleteDocumentWasOpenRef.current = false;
    const closeTarget = deleteDocumentCloseTargetRef.current;
    deleteDocumentCloseTargetRef.current = "trigger";
    if (closeTarget === "search") {
      searchInputRef.current?.focus();
    } else if (deleteDocumentTriggerRef.current?.isConnected) {
      deleteDocumentTriggerRef.current.focus();
    }
  }, [confirmDeleteDocument]);

  useEffect(() => {
    setCitationLine(null);
    setAnnotation("");
    setConfirmDeleteDocument(false);
  }, [activeTargetKey, reviewContextRouteKey, route.citationId, route.lineNumber, route.sectionId]);

  useEffect(() => {
    setImportReceipt((current) => {
      if (!current) return current;
      if (route.documentId === current.documentId) {
        return current.routeSeen ? current : { ...current, routeSeen: true };
      }
      return current.routeSeen ? null : current;
    });
  }, [importReceipt?.documentId, route.documentId]);

  useEffect(() => {
    setQueryDraft(route.query);
    setCitationLine(null);
    setAnnotation("");
    setConfirmDeleteDocument(false);
    let active = true;
    setLoading(true);
    setLoadedRouteKey(null);
    setLoadError(null);
    setSelectionError(null);
    setError(null);
    setDocuments([]);
    setHits([]);
    setSelectedDocument(null);
    setSelectedSourceRights(null);
    setSourceRightsError(null);
    citationRequestVersionRef.current += 1;
    setCitationDocumentId(null);
    setCitations([]);
    setCitationsLoading(false);
    setCitationsError(null);
    void (async () => {
      try {
        const [nextDocuments, nextHits] = await Promise.all([
          knowledgeRepository.listDocuments(),
          route.query.trim()
            ? knowledgeRepository.searchDocuments(route.query, { limit: 100 })
            : Promise.resolve([] as KnowledgeSearchHit[])
        ]);
        const integrityIssue = knowledgeIndexIntegrityIssue(nextDocuments, nextHits);
        if (integrityIssue) throw new Error(integrityIssue);
        let nextSelectionError: string | null = null;
        let nextSelected = route.documentId ? await knowledgeRepository.getDocument(route.documentId) : null;
        if (route.documentId && !nextSelected) {
          nextSelectionError = "指定资料在当前本地知识库中不存在；没有改用标题或内容近似匹配。";
        }
        if (!route.documentId && !nextSelected && route.citationId) {
          try {
            const allCitations = await knowledgeRepository.listCitations();
            const linked = (allCitations as CitationRecord[]).find((citation) => citation.id === route.citationId);
            if (linked) {
              nextSelected = await knowledgeRepository.getDocument(linked.documentId);
              if (!nextSelected) nextSelectionError = "引用指向的资料已不存在；没有显示其他资料作为替代。";
            } else {
              nextSelectionError = "指定引用在当前本地知识库中不存在；没有改用近似引用。";
            }
          } catch (reason) {
            nextSelectionError = safeVisibleErrorMessage(reason, "无法通过引用深链解析资料。");
          }
        }
        let nextSourceRights: SourceRightsRecord | null = null;
        let nextSourceRightsError: string | null = null;
        if (nextSelected) {
          try {
            const rawSourceRights = await knowledgeRepository.getSourceRights(nextSelected.id);
            const validation = sourceRightsRecordSchema.safeParse(rawSourceRights);
            if (!validation.success) {
              nextSourceRightsError = "当前资料没有可验证的来源权利台账记录。";
            } else if (
              validation.data.documentId !== nextSelected.id
              || validation.data.documentContentHash !== nextSelected.contentHash
            ) {
              nextSourceRightsError = "来源权利台账没有绑定当前资料的同一内容指纹。";
            } else {
              nextSourceRights = validation.data;
            }
          } catch (reason) {
            nextSourceRightsError = safeVisibleErrorMessage(reason, "当前资料的来源权利台账不可读。");
          }
        }
        if (!active) return;
        setHits(nextHits);
        setDocuments(nextDocuments);
        setSelectedDocument(nextSelected);
        setSelectedSourceRights(nextSourceRights);
        setSourceRightsError(nextSourceRightsError);
        setSelectionError(nextSelectionError);
        setLoadedRouteKey(dataRouteKey);
        loadCitationIndex(nextSelected?.id ?? null);
      } catch (reason) {
        if (!active) return;
        setLoadError(safeVisibleErrorMessage(reason, "知识库读取失败。"));
        setLoadedRouteKey(dataRouteKey);
        setDocuments([]);
        setHits([]);
        setSelectedDocument(null);
        setSelectedSourceRights(null);
        setSourceRightsError(null);
        loadCitationIndex(null);
        setShowImporter(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      citationRequestVersionRef.current += 1;
    };
  }, [dataRouteKey, loadCitationIndex, reloadToken, route.citationId, route.documentId, route.query]);

  const routeDataMatches = loadedRouteKey === dataRouteKey;
  const pageLoading = loading || !routeDataMatches;
  const citationIndexMatches = Boolean(selectedDocument && citationDocumentId === selectedDocument.id);
  const citationStructureError = useMemo(() => {
    if (!selectedDocument || !citationIndexMatches || citationsLoading || citationsError) return null;
    for (const citation of citations) {
      const section = selectedDocument.sections.find((item) => item.id === citation.locator.sectionId);
      if (
        !section ||
        citation.locator.startLine < section.startLine ||
        citation.locator.endLine > section.endLine
      ) {
        return `引用 ${citation.id} 的定位范围不属于当前资料章节。`;
      }
    }
    return null;
  }, [citationIndexMatches, citations, citationsError, citationsLoading, selectedDocument]);
  const effectiveCitationsError = citationsError ?? citationStructureError;
  const citationIndexReady = citationIndexMatches && !citationsLoading && effectiveCitationsError === null;

  useEffect(() => {
    if (
      !mutationIssue?.reconciliationRequested
      || mutationIssue.reconciliationCompleted
      || pageLoading
      || loadError
      || citationsLoading
    ) return;
    if (selectedDocument && (!citationIndexMatches || effectiveCitationsError)) return;
    setMutationIssue((current) => {
      if (!current?.reconciliationRequested || current.reconciliationCompleted) return current;
      const next = { ...current, reconciliationCompleted: true };
      mutationIssueRef.current = next;
      return next;
    });
  }, [citationIndexMatches, citationsLoading, effectiveCitationsError, loadError, mutationIssue, pageLoading, selectedDocument]);

  const selectedCitation = route.citationId
    ? citations.find((citation) => citation.id === route.citationId) ?? null
    : null;
  const selectedCitationMissing = Boolean(route.citationId && citationIndexReady && !selectedCitation);
  const routeLocationError = useMemo(() => {
    if (!selectedDocument) return null;
    const requestedSection = route.sectionId
      ? selectedDocument.sections.find((section) => section.id === route.sectionId) ?? null
      : null;
    if (route.sectionId && !requestedSection) {
      return "指定章节不属于当前资料；没有回退到第一章节或近似标题。";
    }
    const lineSection = route.lineNumber
      ? sectionContainingLine(selectedDocument, route.lineNumber)
      : null;
    if (route.lineNumber && !lineSection) {
      return "指定行号不属于当前资料的任何章节；没有回退到第一章节或最近行。";
    }
    if (requestedSection && lineSection && requestedSection.id !== lineSection.id) {
      return "指定行号不属于地址中列明的章节；没有跨章节近似定位。";
    }
    if (
      selectedCitation &&
      ((route.sectionId && route.sectionId !== selectedCitation.locator.sectionId) ||
        (route.lineNumber && route.lineNumber !== selectedCitation.locator.startLine))
    ) {
      return "引用、章节与行号没有绑定到同一定位；没有采用其中任一近似位置。";
    }
    return null;
  }, [route.lineNumber, route.sectionId, selectedCitation, selectedDocument]);
  const effectiveSelectionError = selectionError ?? routeLocationError;
  const selectedLines = selectedCitation
    ? { start: selectedCitation.locator.startLine, end: selectedCitation.locator.endLine }
    : route.lineNumber
      ? { start: route.lineNumber, end: route.lineNumber }
      : null;
  const lines = useMemo(() => selectedDocument?.content.split("\n") ?? [], [selectedDocument]);
  const focusLine = selectedCitation?.locator.startLine ?? route.lineNumber;
  const activeSection = selectedDocument && !routeLocationError
    ? (focusLine ? sectionContainingLine(selectedDocument, focusLine) : null)
      ?? selectedDocument.sections.find((section) => section.id === route.sectionId)
      ?? selectedDocument.sections[0]
      ?? null
    : null;
  const focusInsideSection = activeSection && focusLine && focusLine >= activeSection.startLine && focusLine <= activeSection.endLine
    ? focusLine
    : activeSection?.startLine ?? 1;
  const pageStartLine = activeSection
    ? activeSection.startLine + Math.floor((focusInsideSection - activeSection.startLine) / KNOWLEDGE_LINES_PER_PAGE) * KNOWLEDGE_LINES_PER_PAGE
    : 1;
  const pageEndLine = activeSection
    ? Math.min(activeSection.endLine, pageStartLine + KNOWLEDGE_LINES_PER_PAGE - 1)
    : 0;
  const visibleLines = activeSection ? lines.slice(pageStartLine - 1, pageEndLine) : [];
  const sectionStarts = useMemo(
    () => new Map(selectedDocument?.sections.map((section) => [section.startLine, section]) ?? []),
    [selectedDocument]
  );

  useEffect(() => {
    if (!selectedDocument || !focusLine) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`knowledge-line-${focusLine}`)?.scrollIntoView?.({ block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedDocument?.id, focusLine, pageStartLine]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/knowledge${buildKnowledgeSearch({
      query: safeVisibleText(queryDraft, "", 200),
      target: route.target,
      reviewContextLocator: route.reviewContextLocator
    })}`);
  };

  const onDocumentCreated = async (document: KnowledgeDocument) => {
    const persisted = await knowledgeRepository.getDocument(document.id);
    const readbackIssue = importedDocumentReadbackIssue(document, persisted);
    if (readbackIssue || !persisted) {
      throw new Error(`资料写入返回后，仓储回读未能绑定同一记录：${readbackIssue ?? "没有取得回读记录。"}`);
    }
    setImportReceipt({
      documentId: persisted.id,
      title: safeVisibleText(persisted.title, "未命名资料", 180),
      contentHash: persisted.contentHash,
      routeSeen: false
    });
    setShowImporter(false);
    navigate(documentHref({ ...route, query: "" }, persisted));
  };

  const createCitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDocument || !route.target || citationLine === null || !citationIndexReady) return;
    const section = sectionContainingLine(selectedDocument, citationLine);
    if (!section) {
      setError("所选行不属于仓储返回的任何章节，无法建立引用。");
      return;
    }
    const requestedTarget = route.target;
    const mutation: KnowledgeMutation = { kind: "create-citation", subjectId: selectedDocument.id };
    if (!beginKnowledgeMutation(mutation)) return;
    const operationLocationKey = currentKnowledgeLocationKey();
    setSavingCitation(true);
    setError(null);
    let mutationInvoked = false;
    let returnedCitationId: string | null = null;
    try {
      mutationInvoked = true;
      const citation = await knowledgeRepository.createCitation({
        documentId: selectedDocument.id,
        locator: { sectionId: section.id, startLine: citationLine, endLine: citationLine },
        annotation: annotation.trim(),
        targets: [requestedTarget]
      });
      returnedCitationId = citation.id;
      const integrityIssue = citationIndexIntegrityIssue([citation], selectedDocument.id);
      const returnedTarget = citation.targets.length === 1 ? citation.targets[0] : null;
      if (
        integrityIssue ||
        citation.locator.sectionId !== section.id ||
        citation.locator.startLine !== citationLine ||
        citation.locator.endLine !== citationLine ||
        !returnedTarget ||
        targetKey(returnedTarget as KnowledgeCitationTargetContext) !== targetKey(requestedTarget)
      ) {
        throw new Error(
          `引用可能已经写入，但返回记录无法证明本次请求已按原资料、行号与目标保存${integrityIssue ? `：${integrityIssue}` : "。"}`
        );
      }
      if (currentKnowledgeLocationKey() !== operationLocationKey) {
        lockKnowledgeMutationIssue({
          certainty: "returned_unreconciled",
          mutation,
          reference: `Citation ${citation.id} · Document ${selectedDocument.id} · line ${citationLine}`,
          message: "引用写入已经返回并通过请求字段核对，但页面位置在提交期间发生变化，当前视图没有绑定该返回记录。"
        });
        return;
      }
      setCitationLine(null);
      setAnnotation("");
      navigate(documentHref(route, selectedDocument, {
        sectionId: citation.locator.sectionId,
        lineNumber: citation.locator.startLine,
        citationId: citation.id
      }), { scroll: false });
    } catch (reason) {
      const message = safeVisibleErrorMessage(reason, "候选引用创建失败。");
      if (mutationInvoked) {
        lockKnowledgeMutationIssue({
          certainty: returnedCitationId ? "returned_unreconciled" : "call_unknown",
          mutation,
          reference: returnedCitationId
            ? `Citation ${returnedCitationId}`
            : `Document ${selectedDocument.id} · ${section.id}:${citationLine} · target ${targetKey(requestedTarget)}`,
          message: returnedCitationId
            ? `${message} 写入返回后未完成当前视图闭环，请勿重复建立引用。`
            : `${message} 仓储调用没有返回可核对结果，无法证明引用未写入，请勿重复提交。`
        });
      } else if (currentKnowledgeLocationKey() === operationLocationKey) {
        setError(message);
      }
    } finally {
      setSavingCitation(false);
      finishKnowledgeMutation(mutation);
    }
  };

  const closeCitationEditor = () => {
    setCitationLine(null);
    setAnnotation("");
  };

  const cancelDeleteDocument = () => {
    deleteDocumentCloseTargetRef.current = "trigger";
    setConfirmDeleteDocument(false);
  };

  const deleteCitation = async (citation: Citation) => {
    const mutation: KnowledgeMutation = { kind: "delete-citation", subjectId: citation.id };
    if (!beginKnowledgeMutation(mutation)) return;
    const operationLocationKey = currentKnowledgeLocationKey();
    setError(null);
    let mutationInvoked = false;
    let callReturned = false;
    try {
      mutationInvoked = true;
      await knowledgeRepository.deleteCitation(citation.id);
      callReturned = true;
      const persistedCitations = await knowledgeRepository.listCitationsByDocument(citation.documentId);
      const readbackIssue = citationIndexIntegrityIssue(persistedCitations, citation.documentId);
      if (readbackIssue) {
        throw new Error(`引用删除调用已返回，但仓储回读索引无效：${readbackIssue}`);
      }
      if (persistedCitations.some((item) => item.id === citation.id)) {
        throw new Error("引用删除调用已返回，但仓储回读仍包含同一引用 ID。");
      }
      if (currentKnowledgeLocationKey() !== operationLocationKey) {
        lockKnowledgeMutationIssue({
          certainty: "returned_unreconciled",
          mutation,
          reference: `Citation ${citation.id} · delete returned`,
          message: "引用删除调用已经返回，但页面位置在操作期间发生变化，当前引用索引尚未重新核对。"
        });
        return;
      }
      if (route.citationId === citation.id && selectedDocument) {
        navigate(documentHref(route, selectedDocument), { replace: true, scroll: false });
      } else {
        setCitations(sortKnowledgeCitations(persistedCitations));
      }
    } catch (reason) {
      const message = safeVisibleErrorMessage(reason, "引用删除失败。");
      if (mutationInvoked) {
        lockKnowledgeMutationIssue({
          certainty: callReturned ? "returned_unreconciled" : "call_unknown",
          mutation,
          reference: `Citation ${citation.id}`,
          message: callReturned
            ? `${message} 删除调用已经返回，但当前引用索引未完成闭环。`
            : `${message} 仓储调用没有返回可核对结果，无法证明引用仍然存在，请勿原地重试。`
        });
      } else if (currentKnowledgeLocationKey() === operationLocationKey) {
        setError(message);
      }
    } finally {
      finishKnowledgeMutation(mutation);
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument || !citationIndexReady) return;
    const mutation: KnowledgeMutation = { kind: "delete-document", subjectId: selectedDocument.id };
    if (!beginKnowledgeMutation(mutation)) return;
    const operationLocationKey = currentKnowledgeLocationKey();
    setError(null);
    let mutationInvoked = false;
    let callReturned = false;
    try {
      mutationInvoked = true;
      await knowledgeRepository.deleteDocument(selectedDocument.id);
      callReturned = true;
      const [persistedDocument, persistedCitations] = await Promise.all([
        knowledgeRepository.getDocument(selectedDocument.id),
        knowledgeRepository.listCitationsByDocument(selectedDocument.id)
      ]);
      const readbackIssue = citationIndexIntegrityIssue(persistedCitations, selectedDocument.id);
      if (readbackIssue) {
        throw new Error(`资料删除调用已返回，但关联引用回读索引无效：${readbackIssue}`);
      }
      if (persistedDocument || persistedCitations.length > 0) {
        throw new Error("资料删除调用已返回，但仓储回读仍包含该资料或关联引用。");
      }
      if (currentKnowledgeLocationKey() !== operationLocationKey) {
        lockKnowledgeMutationIssue({
          certainty: "returned_unreconciled",
          mutation,
          reference: `Document ${selectedDocument.id} · cascade delete returned`,
          message: "资料级联删除调用已经返回，但页面位置在操作期间发生变化，文档与引用索引尚未重新核对。"
        });
        return;
      }
      deleteDocumentCloseTargetRef.current = "search";
      setConfirmDeleteDocument(false);
      navigate(`/knowledge${buildKnowledgeSearch({
        query: route.query,
        target: route.target,
        reviewContextLocator: route.reviewContextLocator
      })}`, { replace: true });
    } catch (reason) {
      const message = safeVisibleErrorMessage(reason, "资料删除失败。");
      if (mutationInvoked) {
        lockKnowledgeMutationIssue({
          certainty: callReturned ? "returned_unreconciled" : "call_unknown",
          mutation,
          reference: `Document ${selectedDocument.id} · expected cascade ${citations.length} citation(s)`,
          message: callReturned
            ? `${message} 级联删除调用已经返回，但当前文档与引用索引未完成闭环。`
            : `${message} 仓储调用没有返回可核对结果，无法证明资料及关联引用仍然存在，请勿原地重试。`
        });
      } else if (currentKnowledgeLocationKey() === operationLocationKey) {
        setError(message);
      }
    } finally {
      finishKnowledgeMutation(mutation);
    }
  };

  const isReaderView = Boolean(route.documentId || route.citationId);
  const knowledgeWritesBlocked = knowledgeMutation !== null || mutationIssue !== null;
  const returnHref = route.reviewContextLocator
    ? `/cases/${encodeURIComponent(route.reviewContextLocator.caseId)}/revisions/${encodeURIComponent(route.reviewContextLocator.revisionId)}`
    : route.target ? targetReturnHref(route.target) : null;
  const workspaceMode = route.view === "rights"
    ? "来源审计"
    : route.view === "coverage"
      ? "覆盖审计"
      : route.target
        ? "候选引用"
        : "只读浏览";
  const hasActiveQuery = Boolean(route.query.trim());
  const selectedSourceFieldCount = selectedDocument
    ? sourceTraceFieldCount(selectedDocument, selectedSourceRights)
    : 0;
  const selectedSourceUrl = safeExternalSourceUrl(selectedSourceRights?.source.sourceUrl);
  const selectedFileName = selectedDocument ? displayKnowledgeFileName(selectedDocument.fileName) : "未登记";
  const importReceiptState = !importReceipt
    ? null
    : route.documentId !== importReceipt.documentId || pageLoading
      ? "loading"
      : !loadError && !effectiveSelectionError && selectedDocument?.id === importReceipt.documentId && selectedDocument.contentHash === importReceipt.contentHash
        ? "confirmed"
        : "warning";
  const importReceiptTitle = importReceiptState === "confirmed"
    ? "新资料已载入当前阅读器"
    : importReceiptState === "warning"
      ? "新资料已写入，但视图尚未绑定"
      : "新资料已写入，正在绑定视图";
  const importReceiptMessage = importReceiptState === "confirmed"
    ? "当前阅读器的文档 ID 与内容指纹均和仓储回读一致；这仍不证明来源权利、内容真伪或专家结论。"
    : importReceiptState === "warning"
      ? "仓储回读已经确认写入记录，但当前索引或阅读器未能证明同一快照。不要重复导入；请重新读取。"
      : "仓储回读已经确认写入记录，正在按文档 ID 与内容指纹载入同一资料快照。";

  return (
    <div
      className="page page--knowledge"
      data-view={route.view}
      data-reader={isReaderView ? "true" : "false"}
      data-mutation-certainty={mutationIssue?.certainty ?? "not-applicable"}
      data-mutation-reconciliation={mutationIssue?.reconciliationCompleted ? "review-ready" : mutationIssue?.reconciliationRequested ? "reading" : mutationIssue ? "required" : "not-applicable"}
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-db-generation={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.engineeringEvidenceOnly)}
      data-evidence-authority="engineering-only"
      data-source-authenticity-claimed="false"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-index-integrity={loadError ? "unavailable" : pageLoading ? "checking" : "checked"}
      data-write-mode={mutationIssue ? "reconciliation-only" : knowledgeMutation ? "locked" : "available"}
      data-mutation-mode="epoch-guarded"
      data-mutation-epoch-bypassed="false"
      data-print-scope="current-loaded-page"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
    >
      <div className="knowledge-masthead">
        <PageHeading
          eyebrow="Knowledge desk"
          title="个人典籍与引用"
          description="本地导入、全文检索并把原文摘录关联到研究对象。知识引用是独立证据层，不会改写命盘修订事实。"
          actions={route.view === "library" ? <>
            {selectedDocument && !pageLoading && !loadError ? <button type="button" className="secondary-action" title="只打印当前已载入正文分页、来源摘要和可见引用；不会导出整份资料" onClick={() => void printCurrentReadingPage()}><Printer aria-hidden="true" />打印当前阅读页</button> : null}
            {loadError
              ? <AppLink href="/settings/data" className="secondary-action"><FileKey2 aria-hidden="true" />检查本机数据</AppLink>
              : pageLoading
                ? <button type="button" className="primary-action" disabled><FilePlus2 aria-hidden="true" />正在读取资料</button>
                : <button type="button" className="primary-action" disabled={knowledgeWritesBlocked} aria-expanded={showImporter} aria-controls={KNOWLEDGE_IMPORTER_PANEL_ID} onClick={() => setShowImporter((current) => !current)}><FilePlus2 aria-hidden="true" />{mutationIssue ? "写入待核对" : knowledgeMutation ? "写操作进行中" : showImporter ? "收起导入" : "导入资料"}</button>}
          </> : undefined}
        />
        <dl
          className="knowledge-trust-strip"
          aria-label="当前知识工作区摘要"
          aria-live="polite"
          aria-busy={pageLoading || citationsLoading}
        >
          <div data-state={loadError ? "unavailable" : pageLoading ? "loading" : "ready"}><dt>本地资料</dt><dd>{pageLoading ? "读取中" : loadError ? "不可用" : documents.length}</dd></div>
          <div data-state={loadError || effectiveCitationsError ? "unavailable" : citationsLoading ? "loading" : "ready"}><dt>当前引用</dt><dd>{loadError || pageLoading ? "—" : selectedDocument ? citationsLoading ? "读取中" : effectiveCitationsError ? "不可用" : citations.length : "—"}</dd></div>
          <div data-state="context"><dt>入口模式</dt><dd>{workspaceMode}</dd></div>
          <div data-state="boundary"><dt>来源真实性</dt><dd>未核验</dd></div>
        </dl>
      </div>

      <nav className="knowledge-view-tabs" aria-label="知识与来源审计">
        <AppLink className={route.view === "library" ? "is-active" : ""} aria-current={route.view === "library" ? "page" : undefined} href="/knowledge"><BookOpenText aria-hidden="true" /><span><strong>资料库</strong><small>{pageLoading ? "正在读取本地资料" : loadError ? "资料索引不可用" : `${documents.length} 份本地资料`}</small></span></AppLink>
        <AppLink className={route.view === "rights" ? "is-active" : ""} aria-current={route.view === "rights" ? "page" : undefined} href={`/knowledge${buildKnowledgeSearch({ view: "rights" })}`}><FileKey2 aria-hidden="true" /><span><strong>来源台账</strong><small>许可、分发与来源门禁</small></span></AppLink>
        <AppLink className={route.view === "coverage" ? "is-active" : ""} aria-current={route.view === "coverage" ? "page" : undefined} href={`/knowledge${buildKnowledgeSearch({ view: "coverage" })}`}><ListChecks aria-hidden="true" /><span><strong>引用覆盖</strong><small>工程证据覆盖与缺口</small></span></AppLink>
      </nav>

      {route.view === "rights" ? <SourceRightsLedger /> : route.view === "coverage" ? <EvidenceCoverageReport /> : <>
        {route.target ? <div className="knowledge-target-banner"><Link2 aria-hidden="true" /><div><strong>正在为{targetLabel(route.target)}选择来源</strong><p>{route.reviewContextLocator ? "Revision locator 只用于本次字段级只读复核；新建引用仍绑定全局 evidence_subject，不会写入 Case 或 Revision。" : "选中原文行后可建立“用户候选”引用；它不会覆盖旧 sourceRefs、修改修订事实或自动获得分发权。"}</p>{returnHref ? <AppLink className="knowledge-target-return" href={returnHref}><ArrowLeft aria-hidden="true" />{route.reviewContextLocator ? "返回该 Revision" : "返回当前命盘"}</AppLink> : null}</div></div> : null}
        {route.target?.kind === "evidence_subject" ? (
          <Suspense fallback={<section className="knowledge-citation-gate" data-state="loading" role="status" aria-live="polite" aria-atomic="true"><strong>正在载入主题来源审阅…</strong><p>组件载入后仍需手动读取；当前不会自动访问来源记录。</p></section>}>
            <LocalSourceAwareReviewPanel
              subjectId={route.target.subjectId}
              reviewContextLocator={route.reviewContextLocator}
              invalidationToken={`${sourceReviewInvalidationToken}:${reloadToken}`}
            />
          </Suspense>
        ) : null}
        {showImporter && !loadError && !pageLoading ? <div id={KNOWLEDGE_IMPORTER_PANEL_ID}><KnowledgeImporter onCreated={onDocumentCreated} onCommitIssue={(issue) => lockKnowledgeMutationIssue({ certainty: issue.certainty, mutation: { kind: "import-document", subjectId: issue.subjectId }, reference: issue.reference, message: issue.message })} onClose={() => setShowImporter(false)} acquireMutation={acquireImportMutation} mutationBlocked={knowledgeWritesBlocked} /></div> : null}
        {importReceipt ? <div className="knowledge-import-receipt" data-state={importReceiptState} role={importReceiptState === "warning" ? "alert" : "status"} aria-live="polite" aria-atomic="true">
          <FileKey2 aria-hidden="true" />
          <div className="knowledge-import-receipt__body"><p className="eyebrow">Local import receipt</p><strong>{safeVisibleText(importReceiptTitle, "资料导入状态", 180)}</strong><p>{safeVisibleText(importReceiptMessage, "资料导入状态不可显示。", 900)}</p><code>DOC {shortKnowledgeId(importReceipt.documentId)} · HASH {safeVisibleText(importReceipt.contentHash, "不可显示", 160).slice(0, 12)}</code></div>
          <div className="knowledge-import-receipt__actions">{importReceiptState === "warning" ? <button type="button" className="secondary-action" onClick={() => setReloadToken((current) => current + 1)}>重新读取</button> : null}<button type="button" className="icon-button" aria-label={`关闭“${safeVisibleText(importReceipt.title, "未命名资料", 180)}”的导入回执`} onClick={() => setImportReceipt(null)}><X aria-hidden="true" /></button></div>
        </div> : null}
        {mutationIssue ? <section className="knowledge-mutation-issue" data-certainty={mutationIssue.certainty} data-reconciliation={mutationIssue.reconciliationCompleted ? "review-ready" : mutationIssue.reconciliationRequested ? "reading" : "required"} role="alert" aria-labelledby={mutationIssueTitleId}>
          <TriangleAlert aria-hidden="true" />
          <div>
            <p className="eyebrow">{mutationIssue.certainty === "call_unknown" ? "Call unknown · reconciliation required" : "Write returned · index unresolved"}</p>
            <h2 id={mutationIssueTitleId}>{mutationIssue.certainty === "call_unknown" ? "知识写入结果未知，禁止原地重试" : "知识写入已返回，等待索引核对"}</h2>
            <p>{safeVisibleText(mutationIssue.message, "知识写入返回了不可显示的核对信息。")}</p>
            <dl><div><dt>操作</dt><dd>{knowledgeMutationLabel(mutationIssue.mutation.kind)}</dd></div><div><dt>核对线索</dt><dd><code>{safeVisibleText(mutationIssue.reference, "引用不可显示", 700)}</code></dd></div></dl>
            {mutationIssue.reconciliationCompleted ? <div className="knowledge-reconciliation-ready" role="status"><ListChecks aria-hidden="true" /><div><strong>当前文档与引用索引已重新读取</strong><p>系统只确认索引结构可读，不会替你判断本次新增或删除是否发生。请按上方线索核对列表后再解除门禁。</p></div></div> : null}
            <div className="button-row"><button type="button" className="secondary-action" disabled={knowledgeMutation !== null || pageLoading} aria-busy={mutationIssue.reconciliationRequested && pageLoading} onClick={requestKnowledgeMutationReconciliation}><RefreshCw className={mutationIssue.reconciliationRequested && pageLoading ? "is-spinning" : undefined} aria-hidden="true" />{mutationIssue.reconciliationRequested && pageLoading ? "正在重新核对" : mutationIssue.reconciliationCompleted ? "再次重新读取索引" : "重新读取文档与引用索引"}</button>{mutationIssue.reconciliationCompleted ? <button type="button" className="secondary-action knowledge-reconciliation-confirm" disabled={knowledgeMutation !== null} onClick={acceptKnowledgeMutationReconciliation}><ListChecks aria-hidden="true" />我已核对，解除写入门禁</button> : null}<AppLink href="/settings/data" className="text-link">先导出完整备份</AppLink></div>
            <small>{mutationIssue.reconciliationCompleted ? "解除门禁只表示你已人工核对当前本地索引；不证明来源权利、内容真伪、专家结论或公开发布授权。" : "重新读取完成后仍不会自动解除门禁；必须先核对实际文档或引用结果，再由你明确确认。"}</small>
          </div>
        </section> : null}
        {loadError || printError || error || effectiveSelectionError ? <div className="inline-error" role="alert"><strong>{loadError ? "知识库不可读" : printError ? "打印未启动" : effectiveSelectionError ? "知识深链无法定位" : "知识库操作未完成"}</strong><p>{safeVisibleText(loadError ?? printError ?? effectiveSelectionError ?? error, "知识工作区返回了不可显示的错误。")}</p></div> : null}

      <div className={`knowledge-layout ${isReaderView ? "is-reader-view" : "is-list-view"}`} data-state={loadError ? "unavailable" : pageLoading ? "loading" : "ready"}>
        <section className="knowledge-index" aria-label="资料检索">
          <form className="knowledge-search-form" role="search" onSubmit={submitSearch}>
            <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">检索资料</span><input ref={searchInputRef} name="knowledge-query" type="search" enterKeyHint="search" value={queryDraft} maxLength={200} onChange={(event) => setQueryDraft(event.target.value)} placeholder="检索书名、作者或全文" /></label>
            <button type="submit" className="secondary-action">检索</button>
          </form>
          {pageLoading
            ? <p className="knowledge-result-count" role="status" aria-atomic="true">正在读取本地资料…</p>
            : loadError
            ? <p className="knowledge-result-count" role="status" aria-atomic="true">资料结果不可用</p>
            : hasActiveQuery
              ? <p className="knowledge-result-count" role="status" aria-atomic="true">“{safeVisibleText(route.query, "不可显示的检索词", 200)}” · {hits.length} 条定位结果{hits.length === 100 ? " · 已达单次展示上限" : ""}</p>
              : <p className="knowledge-result-count" role="status" aria-atomic="true">{documents.length} 份本地资料</p>}
          {loadError ? <div className="knowledge-unavailable"><FileKey2 aria-hidden="true" /><strong>没有把读取失败解释成空库</strong><p>文档、命中和引用均未取得可靠结果；导入与删除入口保持关闭。</p><button type="button" className="secondary-action" onClick={() => setReloadToken((current) => current + 1)}>重新读取</button></div> : null}
          <nav aria-label="资料列表">
            {hasActiveQuery ? hits.map((hit) => (
              <AppLink
                className={selectedDocument?.id === hit.document.id && route.lineNumber === hit.lineNumber ? "is-active" : ""}
                aria-current={selectedDocument?.id === hit.document.id && route.lineNumber === hit.lineNumber ? "location" : undefined}
                href={documentHref(route, hit.document, { sectionId: hit.sectionId, lineNumber: hit.lineNumber })}
                key={`${hit.document.id}:${hit.sectionId}:${hit.lineNumber}`}
              >
                <span><strong>{safeVisibleText(hit.document.title, "未命名资料", 180)}</strong><small>第 {hit.lineNumber} 行 · {safeVisibleText(hit.excerpt, "命中摘录不可显示", 320)}</small><span className="knowledge-record-label" data-record-type={hit.document.recordType}>{hit.document.recordType === "bundled_knowledge_document" ? "随包登记" : "私有未核验"}</span></span><BookOpenText aria-hidden="true" />
              </AppLink>
            )) : documents.map((document) => (
              <AppLink className={selectedDocument?.id === document.id ? "is-active" : ""} aria-current={selectedDocument?.id === document.id ? "page" : undefined} href={documentHref(route, document)} key={document.id}>
                <span><strong>{safeVisibleText(document.title, "未命名资料", 180)}</strong><small>{safeVisibleText(document.author, "作者未录入", 120)} · {document.lineCount} 行</small><span className="knowledge-record-label" data-record-type={document.recordType}>{document.recordType === "bundled_knowledge_document" ? "随包登记" : "私有未核验"}</span></span><BookOpenText aria-hidden="true" />
              </AppLink>
            ))}
          </nav>
          {!pageLoading && !loadError && hasActiveQuery && !hits.length && documents.length ? <div className="knowledge-no-results"><Search aria-hidden="true" /><strong>没有精确定位结果</strong><p>没有把全部资料回退显示为检索命中。可清除检索后浏览当前 {documents.length} 份资料。</p><AppLink className="secondary-action" href={`/knowledge${buildKnowledgeSearch({ target: route.target, reviewContextLocator: route.reviewContextLocator })}`}><X aria-hidden="true" />清除检索</AppLink></div> : null}
          {!pageLoading && !loadError && !documents.length ? <div className="knowledge-empty"><BookOpenText aria-hidden="true" /><p>{hasActiveQuery ? "没有找到匹配内容，知识库也还没有可浏览的资料。" : "还没有资料，可先导入 Markdown 或 TXT。"}</p></div> : null}
        </section>

        <article className="knowledge-reader" aria-labelledby={selectedDocument ? documentTitleId : undefined} aria-label={selectedDocument ? undefined : "资料阅读器"}>
          {isReaderView ? <AppLink className="knowledge-mobile-back" href={`/knowledge${buildKnowledgeSearch({ query: route.query, target: route.target, reviewContextLocator: route.reviewContextLocator })}`}><ArrowLeft aria-hidden="true" />返回资料列表</AppLink> : null}
          {selectedDocument ? (
            <>
              <p className="knowledge-print-boundary">当前打印只包含页面已载入的正文分页、来源摘要和可见引用；内容指纹只绑定本地快照，不证明来源真实性、专家采用或公开发布授权。</p>
              <header className="knowledge-document-header">
                <div className="knowledge-document-title"><p className="eyebrow">{selectedDocument.format === "markdown" ? "Markdown" : "Plain text"}</p><h2 id={documentTitleId}>{safeVisibleText(selectedDocument.title, "未命名资料", 180)}</h2><p>{[selectedDocument.author, selectedDocument.edition].map((value) => safeVisibleText(value, "", 120)).filter(Boolean).join(" · ") || "作者与版本未录入"}</p></div>
                <StatusPill tone={selectedDocument.recordType === "bundled_knowledge_document" ? "info" : "warning"}>{selectedDocument.recordType === "bundled_knowledge_document" ? "随包登记 · 查权利台账" : "用户私有 · 未核验"}</StatusPill>
                <dl className="knowledge-document-provenance" aria-label="资料来源摘要">
                  <div><dt>登记类型</dt><dd>{selectedDocument.recordType === "bundled_knowledge_document" ? "随包登记" : "用户导入"}</dd></div>
                  <div><dt>原始文件</dt><dd title={selectedFileName}>{selectedFileName}</dd></div>
                  <div><dt>来源线索</dt><dd>{selectedSourceFieldCount} / 6 项</dd></div>
                  <div><dt>内容指纹</dt><dd><code title={safeVisibleText(selectedDocument.contentHash, "摘要不可显示", 160)}>{safeVisibleText(selectedDocument.contentHash, "不可显示", 160).slice(0, 12)}</code></dd></div>
                  <div><dt>更新时间</dt><dd>{formatDate(selectedDocument.updatedAt)}</dd></div>
                  <div><dt>权利边界</dt><dd>{selectedDocument.recordType === "bundled_knowledge_document" ? "以来源台账门禁为准" : "未核验，仅本机"}</dd></div>
                </dl>
              </header>
              <section className="knowledge-source-ledger" aria-labelledby={sourceLedgerTitleId}>
                <header>
                  <div><p className="eyebrow">Source trace</p><h3 id={sourceLedgerTitleId}>来源追溯</h3></div>
                  <StatusPill tone={sourceRightsError ? "warning" : selectedSourceFieldCount >= 3 ? "info" : "neutral"}>{sourceRightsError ? "来源台账不可用" : `${selectedSourceFieldCount} / 6 项线索`}</StatusPill>
                </header>
                {sourceRightsError ? <div className="knowledge-source-boundary" role="note"><TriangleAlert aria-hidden="true" /><div><strong>没有把缺失台账当作空书目信息</strong><p>{safeVisibleText(sourceRightsError, "当前资料的来源权利台账不可读。", 500)}</p></div></div> : null}
                <dl className="knowledge-source-fields">
                  <div><dt>作者</dt><dd>{safeVisibleText(selectedDocument.author, "未录入", 160)}</dd></div>
                  <div><dt>版本 / 版次</dt><dd>{safeVisibleText(selectedDocument.edition, "未录入", 160)}</dd></div>
                  <div><dt>出版者</dt><dd>{safeVisibleText(selectedSourceRights?.source.publisher, sourceRightsError ? "台账不可用" : "未录入", 160)}</dd></div>
                  <div><dt>出版年份</dt><dd>{selectedSourceRights?.source.publicationYear ?? (sourceRightsError ? "台账不可用" : "未录入")}</dd></div>
                  <div><dt>来源网址</dt><dd>{selectedSourceUrl ? <a href={selectedSourceUrl} target="_blank" rel="noopener noreferrer" title={safeVisibleText(selectedSourceRights?.source.sourceUrl, "", 2_048) || undefined} aria-label="打开登记来源（在新窗口打开）"><Link2 aria-hidden="true" />打开登记来源</a> : selectedSourceRights?.source.sourceUrl ? <span title={safeVisibleText(selectedSourceRights.source.sourceUrl, "地址不可显示", 2_048)}>仅允许无凭据 HTTPS 地址</span> : sourceRightsError ? "台账不可用" : "未录入"}</dd></div>
                  <div><dt>原始文件</dt><dd title={selectedFileName}>{selectedFileName} · {formatByteSize(selectedDocument.byteSize)}</dd></div>
                </dl>
                <div className={`knowledge-source-note ${selectedDocument.sourceNote ? "" : "is-missing"}`}><strong>来源备注</strong><p>{safeVisibleText(selectedDocument.sourceNote, "未录入购入版本、整理者或使用限制。", 1_200)}</p></div>
                <div className="knowledge-source-boundary" data-record-type={selectedDocument.recordType}><FileKey2 aria-hidden="true" /><div><strong>解释边界</strong><p>{selectedDocument.recordType === "bundled_knowledge_document" ? "随包登记不等于当前页面已经证明可再分发；请以来源台账的逐项门禁为准。" : "用户导入资料默认保持未核验、仅本机；书目信息完整也不会自动提升权利状态或成为专家真值。"}</p></div></div>
              </section>
              <nav className="knowledge-section-nav" aria-label="资料章节">
                {selectedDocument.sections.map((section) => <AppLink href={documentHref(route, selectedDocument, { sectionId: section.id, lineNumber: section.startLine })} key={section.id} className={activeSection?.id === section.id ? "is-active" : ""} aria-current={activeSection?.id === section.id ? "location" : undefined}>{safeVisibleText(section.title, "未命名章节", 180)}</AppLink>)}
              </nav>
              {activeSection ? <div className="knowledge-page-position" role="status" aria-atomic="true"><span>《{safeVisibleText(selectedDocument.title, "未命名资料", 180)}》 · {safeVisibleText(activeSection.title, "未命名章节", 180)} · {focusLine ? `当前第 ${focusLine} 行` : `第 ${pageStartLine}–${pageEndLine} 行`} / 共 {selectedDocument.lineCount} 行</span><progress max={Math.max(1, selectedDocument.lineCount)} value={Math.min(selectedDocument.lineCount, focusLine ?? pageEndLine)} aria-label={`阅读位置：第 ${focusLine ?? pageEndLine} 行，共 ${selectedDocument.lineCount} 行`} /></div> : null}
              <div className="knowledge-content" role="region" aria-label="资料正文">
                {visibleLines.map((rawLine, index) => {
                  const lineNumber = pageStartLine + index;
                  const rendered = renderKnowledgeLine(rawLine, selectedDocument.format, sectionStarts.get(lineNumber) ?? null);
                  const isSelected = Boolean(selectedLines && lineNumber >= selectedLines.start && lineNumber <= selectedLines.end);
                  return <div id={`knowledge-line-${lineNumber}`} className={`knowledge-line ${isSelected ? "is-selected" : ""} ${rendered.headingLevel ? `is-heading level-${rendered.headingLevel}` : ""}`} key={lineNumber}>
                    <span className="knowledge-line-number" aria-hidden="true">{lineNumber}</span>
                    <span className="knowledge-line-text" role={rendered.headingLevel ? "heading" : undefined} aria-level={rendered.headingLevel ? accessibleKnowledgeHeadingLevel(rendered.headingLevel) : undefined}>{rendered.text || " "}</span>
                    {route.target && citationIndexReady && rawLine.trim() ? <button type="button" className="knowledge-cite-line" disabled={knowledgeWritesBlocked} aria-expanded={citationLine === lineNumber} aria-controls={citationEditorId} onClick={(event) => { citationTriggerRef.current = event.currentTarget; setCitationLine(lineNumber); setAnnotation(""); }} aria-label={`引用第 ${lineNumber} 行`}><Quote aria-hidden="true" /></button> : null}
                  </div>;
                })}
              </div>
              {activeSection && (pageStartLine > activeSection.startLine || pageEndLine < activeSection.endLine) ? <nav className="knowledge-pagination" aria-label="正文分页">
                {pageStartLine > activeSection.startLine ? <AppLink className="secondary-action" href={documentHref(route, selectedDocument, { sectionId: activeSection.id, lineNumber: Math.max(activeSection.startLine, pageStartLine - KNOWLEDGE_LINES_PER_PAGE) })}>上一页</AppLink> : <span />}
                <small>每页最多 {KNOWLEDGE_LINES_PER_PAGE} 行</small>
                {pageEndLine < activeSection.endLine ? <AppLink className="secondary-action" href={documentHref(route, selectedDocument, { sectionId: activeSection.id, lineNumber: pageStartLine + KNOWLEDGE_LINES_PER_PAGE })}>下一页</AppLink> : <span />}
              </nav> : null}
              {route.target && citationIndexReady && citationLine !== null ? <form id={citationEditorId} className="knowledge-citation-editor" aria-labelledby={citationEditorTitleId} onSubmit={createCitation}>
                <div><p className="eyebrow">Candidate citation</p><h2 ref={citationEditorHeadingRef} id={citationEditorTitleId} tabIndex={-1}>引用第 {citationLine} 行</h2><blockquote>{lines[citationLine - 1]}</blockquote><p>关联到：{targetLabel(route.target)}</p></div>
                <label className="field"><span>批注（可选）</span><textarea rows={3} maxLength={1000} value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder="记录为什么这段原文与研究对象相关" /></label>
                <div className="journal-actions"><button type="submit" className="primary-action" disabled={savingCitation || knowledgeWritesBlocked} aria-busy={savingCitation}><Link2 aria-hidden="true" />{savingCitation ? "正在建立…" : mutationIssue ? "写入待核对" : "建立候选引用"}</button><button type="button" className="secondary-action" onClick={closeCitationEditor} disabled={knowledgeMutation !== null}><X aria-hidden="true" />取消</button></div>
              </form> : null}
              <section className="knowledge-delete-zone">
                {!citationIndexReady ? <div className="knowledge-citation-gate" data-state={effectiveCitationsError ? "error" : "loading"}><strong>删除入口保持关闭</strong><p>{effectiveCitationsError ? "引用索引不可用，无法可靠说明级联删除范围。" : "正在核对关联引用，完成后才开放资料删除。"}</p></div> : !confirmDeleteDocument ? <button ref={deleteDocumentTriggerRef} type="button" className="text-danger-action" disabled={knowledgeWritesBlocked} onClick={() => { deleteDocumentCloseTargetRef.current = "trigger"; setConfirmDeleteDocument(true); }}><Trash2 aria-hidden="true" />删除此资料</button> : <div ref={deleteDocumentConfirmRef} className="knowledge-delete-confirm" role="group" aria-labelledby={deleteDocumentTitleId} aria-describedby={deleteDocumentDescriptionId} tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape" && knowledgeMutation === null) { event.preventDefault(); cancelDeleteDocument(); } }}><p><strong id={deleteDocumentTitleId}>确认删除“{safeVisibleText(selectedDocument.title, "未命名资料", 180)}”？</strong> <span id={deleteDocumentDescriptionId}>同时会移除这份资料的 {citations.length} 条独立引用，此操作不可撤销。</span></p><div className="journal-actions"><button type="button" className="danger-action" onClick={() => void deleteDocument()} disabled={knowledgeWritesBlocked} aria-busy={knowledgeMutation?.kind === "delete-document"}><Trash2 aria-hidden="true" />{knowledgeMutation?.kind === "delete-document" ? "删除中…" : mutationIssue ? "写入待核对" : "确认删除"}</button><button type="button" className="secondary-action" onClick={cancelDeleteDocument} disabled={knowledgeMutation !== null}>取消</button></div></div>}
              </section>
            </>
          ) : pageLoading ? <p role="status">正在读取知识库…</p> : loadError ? <div className="knowledge-reader-placeholder is-unavailable"><FileKey2 aria-hidden="true" /><h2>阅读器保持关闭</h2><p>当前没有可靠文档可供定位；这里不会显示旧内容或近似恢复结果。</p></div> : <div className="knowledge-reader-placeholder"><BookOpenText aria-hidden="true" /><h2>选择一份资料开始阅读</h2><p>普通入口只提供阅读与检索。要建立引用，请从命盘字段、研究笔记或事件记录进入。</p></div>}
        </article>

        <aside className="knowledge-backlinks" aria-label="资料引用">
          <p className="eyebrow">独立引用</p>
          <h2>{loadError ? "引用不可用" : selectedDocument ? citationsLoading ? "正在读取引用" : effectiveCitationsError ? "引用不可用" : `${citations.length} 条引用` : "尚未选择资料"}</h2>
          {loadError ? <p>读取失败期间不展示陈旧引用，也不允许删除或建立新关联。</p> : null}
          {selectedDocument && (citationsLoading || effectiveCitationsError) ? <div className="knowledge-citation-gate" data-state={effectiveCitationsError ? "error" : "loading"} role={effectiveCitationsError ? "alert" : "status"}><strong>{effectiveCitationsError ? "引用索引暂不可用" : "正在核对当前资料引用"}</strong><p>{effectiveCitationsError ? `${safeVisibleText(effectiveCitationsError, "引用索引不可用。", 900)} 未验真的引用不会显示为零。` : "完成前不开放引用创建、删除或资料级联删除。"}</p>{effectiveCitationsError ? <button type="button" className="secondary-action" onClick={() => loadCitationIndex(selectedDocument.id)}>重新读取引用</button> : null}</div> : null}
          {selectedCitationMissing ? <div className="knowledge-citation-gate" data-state="error" role="alert"><strong>指定引用不属于当前资料</strong><p>没有改用其他引用或近似行号。</p></div> : null}
          {selectedDocument && !route.target ? <p>当前为只读入口。请从命盘字段、研究笔记或事件记录进入，建立带目标的候选引用。</p> : null}
          <div className="knowledge-citation-list">
            {citationIndexReady ? citations.map((citation) => <article className={selectedCitation?.id === citation.id ? "is-active" : ""} key={citation.id}>
              <header><StatusPill tone="warning">用户候选</StatusPill><small>{formatDate(citation.updatedAt)}</small></header>
              <AppLink aria-current={selectedCitation?.id === citation.id ? "location" : undefined} href={documentHref(route, selectedDocument!, { sectionId: citation.locator.sectionId, lineNumber: citation.locator.startLine, citationId: citation.id })}><blockquote>{citation.quote}</blockquote></AppLink>
              {citation.annotation ? <p>{safeVisibleText(citation.annotation, "批注不可显示", 1_000)}</p> : null}
              <ul>{citation.targets.map((target, index) => <li key={`${target.kind}:${index}`}>{citationTargetLabel(target)}</li>)}</ul>
              <button type="button" className="text-danger-action" onClick={() => void deleteCitation(citation)} disabled={knowledgeWritesBlocked} aria-busy={knowledgeMutation?.kind === "delete-citation" && knowledgeMutation.subjectId === citation.id}><Trash2 aria-hidden="true" />{knowledgeMutation?.kind === "delete-citation" && knowledgeMutation.subjectId === citation.id ? "删除中…" : mutationIssue ? "写入待核对" : "删除引用"}</button>
            </article>) : null}
          </div>
          {selectedDocument && citationIndexReady && !citations.length ? <p>这份资料还没有结构化引用；旧 sourceRefs 仍会在原位置保留。</p> : null}
        </aside>
      </div>
      </>}
    </div>
  );
}
