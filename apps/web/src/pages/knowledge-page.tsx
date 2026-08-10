import { ArrowLeft, BookOpenText, FileKey2, FilePlus2, Link2, ListChecks, Quote, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { CitationRecord, KnowledgeDocumentRecord, KnowledgeSection } from "@hakimi/contracts";
import { knowledgeRepository } from "@hakimi/storage";
import { KnowledgeImporter } from "../components/knowledge-importer";
import { EvidenceCoverageReport } from "../components/evidence-coverage-report";
import { PageHeading } from "../components/page-heading";
import { SourceRightsLedger } from "../components/source-rights-ledger";
import { StatusPill } from "../components/status-pill";
import {
  buildKnowledgeSearch,
  parseKnowledgeRoute,
  type KnowledgeCitationTargetContext,
  type KnowledgeRouteState
} from "../lib/knowledge-route";
import { AppLink, navigate, useAppLocation } from "../lib/router";

type KnowledgeDocument = KnowledgeDocumentRecord;
type KnowledgeSearchHit = { document: KnowledgeDocumentRecord; sectionId: string; lineNumber: number; excerpt: string };
type Citation = CitationRecord;

const KNOWLEDGE_LINES_PER_PAGE = 400;
const KNOWLEDGE_IMPORTER_PANEL_ID = "knowledge-importer-panel";

function targetLabel(target: KnowledgeCitationTargetContext): string {
  if (target.kind === "research_note") return `研究笔记 ${target.noteId.slice(0, 8)}`;
  if (target.kind === "event") return `真实事件 ${target.eventId.slice(0, 8)}`;
  if (target.kind === "evidence_subject") return `证据主题 ${target.subjectId}`;
  return `命盘字段 ${target.field}`;
}

function targetReturnHref(target: KnowledgeCitationTargetContext): string | null {
  return target.kind === "chart_field"
    ? `/cases/${target.caseId}/revisions/${target.revisionId}`
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
  if (target.kind === "research_note") return `研究笔记 ${target.noteId.slice(0, 8)}`;
  if (target.kind === "event") return `真实事件 ${target.eventId.slice(0, 8)}`;
  if (target.kind === "evidence_subject") return `证据主题 ${target.subjectId}`;
  return `命盘字段 ${target.field}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
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
    target: route.target
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
  const location = useAppLocation();
  const route = useMemo(() => parseKnowledgeRoute(location.search), [location.search]);
  const activeTargetKey = targetKey(route.target);
  const [queryDraft, setQueryDraft] = useState(route.query);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [hits, setHits] = useState<KnowledgeSearchHit[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [citationLine, setCitationLine] = useState<number | null>(null);
  const [annotation, setAnnotation] = useState("");
  const [savingCitation, setSavingCitation] = useState(false);
  const [confirmDeleteDocument, setConfirmDeleteDocument] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const citationEditorHeadingRef = useRef<HTMLHeadingElement>(null);
  const citationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const citationEditorWasOpenRef = useRef(false);
  const deleteDocumentTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteDocumentConfirmRef = useRef<HTMLDivElement>(null);
  const deleteDocumentWasOpenRef = useRef(false);
  const deleteDocumentCloseTargetRef = useRef<"trigger" | "search">("trigger");

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

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextDocuments, nextHits] = await Promise.all([
        knowledgeRepository.listDocuments(),
        route.query.trim()
          ? knowledgeRepository.searchDocuments(route.query, { limit: 100 })
          : Promise.resolve([] as KnowledgeSearchHit[])
      ]);

      let nextSelected = route.documentId
        ? await knowledgeRepository.getDocument(route.documentId)
        : null;
      if (!nextSelected && route.citationId) {
        const allCitations = await knowledgeRepository.listCitations();
        const linked = (allCitations as CitationRecord[]).find((citation) => citation.id === route.citationId);
        if (linked) nextSelected = await knowledgeRepository.getDocument(linked.documentId);
      }
      const nextCitations = nextSelected
        ? await knowledgeRepository.listCitationsByDocument(nextSelected.id)
        : [];
      setHits(nextHits);
      setDocuments(nextDocuments);
      setSelectedDocument(nextSelected);
      setCitations(nextCitations);
    } catch (reason) {
      setError(errorMessage(reason, "知识库读取失败。"));
      setSelectedDocument(null);
      setCitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQueryDraft(route.query);
    setCitationLine(null);
    setAnnotation("");
    setConfirmDeleteDocument(false);
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [nextDocuments, nextHits] = await Promise.all([
          knowledgeRepository.listDocuments(),
          route.query.trim()
            ? knowledgeRepository.searchDocuments(route.query, { limit: 100 })
            : Promise.resolve([] as KnowledgeSearchHit[])
        ]);
        let nextSelected = route.documentId
          ? await knowledgeRepository.getDocument(route.documentId)
          : null;
        if (!nextSelected && route.citationId) {
          const allCitations = await knowledgeRepository.listCitations();
          const linked = (allCitations as CitationRecord[]).find((citation) => citation.id === route.citationId);
          if (linked) nextSelected = await knowledgeRepository.getDocument(linked.documentId);
        }
        const nextCitations = nextSelected
          ? await knowledgeRepository.listCitationsByDocument(nextSelected.id)
          : [];
        if (!active) return;
        setHits(nextHits);
        setDocuments(nextDocuments);
        setSelectedDocument(nextSelected);
        setCitations(nextCitations);
      } catch (reason) {
        if (!active) return;
        setError(errorMessage(reason, "知识库读取失败。"));
        setSelectedDocument(null);
        setCitations([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [route.query, route.documentId, route.citationId, activeTargetKey]);

  const selectedCitation = route.citationId
    ? citations.find((citation) => citation.id === route.citationId) ?? null
    : null;
  const selectedLines = selectedCitation
    ? { start: selectedCitation.locator.startLine, end: selectedCitation.locator.endLine }
    : route.lineNumber
      ? { start: route.lineNumber, end: route.lineNumber }
      : null;
  const lines = useMemo(() => selectedDocument?.content.split("\n") ?? [], [selectedDocument]);
  const focusLine = selectedCitation?.locator.startLine ?? route.lineNumber;
  const activeSection = selectedDocument
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
    window.requestAnimationFrame(() => {
      document.getElementById(`knowledge-line-${focusLine}`)?.scrollIntoView?.({ block: "center" });
    });
  }, [selectedDocument?.id, focusLine, pageStartLine]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/knowledge${buildKnowledgeSearch({ query: queryDraft.trim(), target: route.target })}`);
  };

  const onDocumentCreated = async (document: KnowledgeDocument) => {
    setShowImporter(false);
    await refresh();
    navigate(documentHref({ ...route, query: "" }, document));
  };

  const createCitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDocument || !route.target || citationLine === null) return;
    const section = sectionContainingLine(selectedDocument, citationLine);
    if (!section) {
      setError("所选行不属于仓储返回的任何章节，无法建立引用。");
      return;
    }
    setSavingCitation(true);
    setError(null);
    try {
      const citation = await knowledgeRepository.createCitation({
        documentId: selectedDocument.id,
        locator: { sectionId: section.id, startLine: citationLine, endLine: citationLine },
        annotation: annotation.trim(),
        targets: [route.target]
      });
      setCitationLine(null);
      setAnnotation("");
      await refresh();
      navigate(documentHref(route, selectedDocument, {
        sectionId: citation.locator.sectionId,
        lineNumber: citation.locator.startLine,
        citationId: citation.id
      }), { scroll: false });
    } catch (reason) {
      setError(errorMessage(reason, "候选引用创建失败。"));
    } finally {
      setSavingCitation(false);
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
    setError(null);
    try {
      await knowledgeRepository.deleteCitation(citation.id);
      await refresh();
      if (route.citationId === citation.id && selectedDocument) {
        navigate(documentHref(route, selectedDocument), { replace: true, scroll: false });
      }
    } catch (reason) {
      setError(errorMessage(reason, "引用删除失败。"));
    }
  };

  const deleteDocument = async () => {
    if (!selectedDocument) return;
    setError(null);
    try {
      await knowledgeRepository.deleteDocument(selectedDocument.id);
      deleteDocumentCloseTargetRef.current = "search";
      setConfirmDeleteDocument(false);
      navigate(`/knowledge${buildKnowledgeSearch({ query: route.query, target: route.target })}`, { replace: true });
    } catch (reason) {
      setError(errorMessage(reason, "资料删除失败。"));
    }
  };

  const isReaderView = Boolean(route.documentId || route.citationId);
  const returnHref = route.target ? targetReturnHref(route.target) : null;

  return (
    <div className="page">
      <PageHeading
        eyebrow="Knowledge desk"
        title="个人典籍与引用"
        description="本地导入、全文检索并把原文摘录关联到研究对象。知识引用是独立证据层，不会改写命盘修订事实。"
        actions={route.view === "library" ? <button type="button" className="primary-action" aria-expanded={showImporter} aria-controls={KNOWLEDGE_IMPORTER_PANEL_ID} onClick={() => setShowImporter((current) => !current)}><FilePlus2 aria-hidden="true" />{showImporter ? "收起导入" : "导入资料"}</button> : undefined}
      />

      <nav className="knowledge-view-tabs" aria-label="知识与来源审计">
        <AppLink className={route.view === "library" ? "is-active" : ""} aria-current={route.view === "library" ? "page" : undefined} href="/knowledge"><BookOpenText aria-hidden="true" />资料库</AppLink>
        <AppLink className={route.view === "rights" ? "is-active" : ""} aria-current={route.view === "rights" ? "page" : undefined} href={`/knowledge${buildKnowledgeSearch({ view: "rights" })}`}><FileKey2 aria-hidden="true" />来源台账</AppLink>
        <AppLink className={route.view === "coverage" ? "is-active" : ""} aria-current={route.view === "coverage" ? "page" : undefined} href={`/knowledge${buildKnowledgeSearch({ view: "coverage" })}`}><ListChecks aria-hidden="true" />引用覆盖</AppLink>
      </nav>

      {route.view === "rights" ? <SourceRightsLedger /> : route.view === "coverage" ? <EvidenceCoverageReport /> : <>
        {route.target ? <div className="knowledge-target-banner"><Link2 aria-hidden="true" /><div><strong>正在为{targetLabel(route.target)}选择来源</strong><p>选中原文行后可建立“用户候选”引用；它不会覆盖旧 sourceRefs、修改修订事实或自动获得分发权。</p>{returnHref ? <AppLink className="knowledge-target-return" href={returnHref}><ArrowLeft aria-hidden="true" />返回当前命盘</AppLink> : null}</div></div> : null}
        {showImporter ? <div id={KNOWLEDGE_IMPORTER_PANEL_ID}><KnowledgeImporter onCreated={onDocumentCreated} onClose={() => setShowImporter(false)} /></div> : null}
        {error ? <div className="inline-error" role="alert"><strong>知识库操作未完成</strong><p>{error}</p></div> : null}

      <div className={`knowledge-layout ${isReaderView ? "is-reader-view" : "is-list-view"}`}>
        <section className="knowledge-index" aria-label="资料检索">
          <form className="knowledge-search-form" role="search" onSubmit={submitSearch}>
            <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">检索资料</span><input ref={searchInputRef} value={queryDraft} maxLength={200} onChange={(event) => setQueryDraft(event.target.value)} placeholder="检索书名、作者或全文" /></label>
            <button type="submit" className="secondary-action">检索</button>
          </form>
          {route.query ? <p className="knowledge-result-count" role="status" aria-atomic="true">“{route.query}” · {hits.length} 条结果{!hits.length && documents.length ? `；显示全部 ${documents.length} 份资料` : ""}</p> : <p className="knowledge-result-count" role="status" aria-atomic="true">{documents.length} 份本地资料</p>}
          <nav aria-label="资料列表">
            {route.query && hits.length ? hits.map((hit) => (
              <AppLink
                className={selectedDocument?.id === hit.document.id && route.lineNumber === hit.lineNumber ? "is-active" : ""}
                aria-current={selectedDocument?.id === hit.document.id && route.lineNumber === hit.lineNumber ? "location" : undefined}
                href={documentHref(route, hit.document, { sectionId: hit.sectionId, lineNumber: hit.lineNumber })}
                key={`${hit.document.id}:${hit.sectionId}:${hit.lineNumber}`}
              >
                <span><strong>{hit.document.title}</strong><small>第 {hit.lineNumber} 行 · {hit.excerpt}</small></span><BookOpenText aria-hidden="true" />
              </AppLink>
            )) : documents.map((document) => (
              <AppLink className={selectedDocument?.id === document.id ? "is-active" : ""} aria-current={selectedDocument?.id === document.id ? "page" : undefined} href={documentHref(route, document)} key={document.id}>
                <span><strong>{document.title}</strong><small>{document.author || "作者未录入"} · {document.lineCount} 行</small></span><BookOpenText aria-hidden="true" />
              </AppLink>
            ))}
          </nav>
          {!loading && !documents.length && !hits.length ? <div className="knowledge-empty"><BookOpenText aria-hidden="true" /><p>{route.query ? "没有找到匹配内容，知识库也还没有可浏览的资料。" : "还没有资料，可先导入 Markdown 或 TXT。"}</p></div> : null}
        </section>

        <article className="knowledge-reader" aria-labelledby={selectedDocument ? "knowledge-document-title" : undefined} aria-label={selectedDocument ? undefined : "资料阅读器"}>
          {selectedDocument ? (
            <>
              <AppLink className="knowledge-mobile-back" href={`/knowledge${buildKnowledgeSearch({ query: route.query, target: route.target })}`}><ArrowLeft aria-hidden="true" />返回资料列表</AppLink>
              <header className="knowledge-document-header">
                <div><p className="eyebrow">{selectedDocument.format === "markdown" ? "Markdown" : "Plain text"}</p><h2 id="knowledge-document-title">{selectedDocument.title}</h2><p>{[selectedDocument.author, selectedDocument.edition].filter(Boolean).join(" · ") || "作者与版本未录入"}</p></div>
                <StatusPill tone={selectedDocument.recordType === "bundled_knowledge_document" ? "info" : "warning"}>{selectedDocument.recordType === "bundled_knowledge_document" ? "随包资料 · 查看权利台账" : "用户私有 · 未核验"}</StatusPill>
              </header>
              {selectedDocument.sourceNote ? <p className="knowledge-source-note">来源备注：{selectedDocument.sourceNote}</p> : null}
              <nav className="knowledge-section-nav" aria-label="资料章节">
                {selectedDocument.sections.map((section) => <AppLink href={documentHref(route, selectedDocument, { sectionId: section.id, lineNumber: section.startLine })} key={section.id} className={activeSection?.id === section.id ? "is-active" : ""} aria-current={activeSection?.id === section.id ? "location" : undefined}>{section.title}</AppLink>)}
              </nav>
              {activeSection ? <p className="knowledge-page-position" role="status" aria-atomic="true">《{selectedDocument.title}》 · {activeSection.title} · {focusLine ? `当前第 ${focusLine} 行` : `第 ${pageStartLine}–${pageEndLine} 行`} / 共 {selectedDocument.lineCount} 行</p> : null}
              <div className="knowledge-content" role="region" aria-label="资料正文">
                {visibleLines.map((rawLine, index) => {
                  const lineNumber = pageStartLine + index;
                  const rendered = renderKnowledgeLine(rawLine, selectedDocument.format, sectionStarts.get(lineNumber) ?? null);
                  const isSelected = Boolean(selectedLines && lineNumber >= selectedLines.start && lineNumber <= selectedLines.end);
                  return <div id={`knowledge-line-${lineNumber}`} className={`knowledge-line ${isSelected ? "is-selected" : ""} ${rendered.headingLevel ? `is-heading level-${rendered.headingLevel}` : ""}`} key={lineNumber}>
                    <span className="knowledge-line-number" aria-hidden="true">{lineNumber}</span>
                    <span className="knowledge-line-text" role={rendered.headingLevel ? "heading" : undefined} aria-level={rendered.headingLevel ? accessibleKnowledgeHeadingLevel(rendered.headingLevel) : undefined}>{rendered.text || " "}</span>
                    {route.target && rawLine.trim() ? <button type="button" className="knowledge-cite-line" aria-expanded={citationLine === lineNumber} aria-controls="knowledge-citation-editor" onClick={(event) => { citationTriggerRef.current = event.currentTarget; setCitationLine(lineNumber); setAnnotation(""); }} aria-label={`引用第 ${lineNumber} 行`}><Quote aria-hidden="true" /></button> : null}
                  </div>;
                })}
              </div>
              {activeSection && (pageStartLine > activeSection.startLine || pageEndLine < activeSection.endLine) ? <nav className="knowledge-pagination" aria-label="正文分页">
                {pageStartLine > activeSection.startLine ? <AppLink className="secondary-action" href={documentHref(route, selectedDocument, { sectionId: activeSection.id, lineNumber: Math.max(activeSection.startLine, pageStartLine - KNOWLEDGE_LINES_PER_PAGE) })}>上一页</AppLink> : <span />}
                <small>每页最多 {KNOWLEDGE_LINES_PER_PAGE} 行</small>
                {pageEndLine < activeSection.endLine ? <AppLink className="secondary-action" href={documentHref(route, selectedDocument, { sectionId: activeSection.id, lineNumber: pageStartLine + KNOWLEDGE_LINES_PER_PAGE })}>下一页</AppLink> : <span />}
              </nav> : null}
              {route.target && citationLine !== null ? <form id="knowledge-citation-editor" className="knowledge-citation-editor" aria-labelledby="knowledge-citation-editor-title" onSubmit={createCitation}>
                <div><p className="eyebrow">Candidate citation</p><h2 ref={citationEditorHeadingRef} id="knowledge-citation-editor-title" tabIndex={-1}>引用第 {citationLine} 行</h2><blockquote>{lines[citationLine - 1]}</blockquote><p>关联到：{targetLabel(route.target)}</p></div>
                <label className="field"><span>批注（可选）</span><textarea rows={3} maxLength={1000} value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder="记录为什么这段原文与研究对象相关" /></label>
                <div className="journal-actions"><button type="submit" className="primary-action" disabled={savingCitation}><Link2 aria-hidden="true" />{savingCitation ? "正在建立…" : "建立候选引用"}</button><button type="button" className="secondary-action" onClick={closeCitationEditor}><X aria-hidden="true" />取消</button></div>
              </form> : null}
              <section className="knowledge-delete-zone">
                {!confirmDeleteDocument ? <button ref={deleteDocumentTriggerRef} type="button" className="text-danger-action" onClick={() => { deleteDocumentCloseTargetRef.current = "trigger"; setConfirmDeleteDocument(true); }}><Trash2 aria-hidden="true" />删除此资料</button> : <div ref={deleteDocumentConfirmRef} className="knowledge-delete-confirm" role="group" aria-labelledby="knowledge-delete-document-title" aria-describedby="knowledge-delete-document-description" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelDeleteDocument(); } }}><p><strong id="knowledge-delete-document-title">确认删除“{selectedDocument.title}”？</strong> <span id="knowledge-delete-document-description">同时会移除这份资料的 {citations.length} 条独立引用，此操作不可撤销。</span></p><div className="journal-actions"><button type="button" className="danger-action" onClick={() => void deleteDocument()}><Trash2 aria-hidden="true" />确认删除</button><button type="button" className="secondary-action" onClick={cancelDeleteDocument}>取消</button></div></div>}
              </section>
            </>
          ) : loading ? <p role="status">正在读取知识库…</p> : <div className="knowledge-reader-placeholder"><BookOpenText aria-hidden="true" /><h2>选择一份资料开始阅读</h2><p>普通入口只提供阅读与检索。要建立引用，请从命盘字段、研究笔记或真实事件进入。</p></div>}
        </article>

        <aside className="knowledge-backlinks" aria-label="资料引用">
          <p className="eyebrow">独立引用</p>
          <h2>{selectedDocument ? `${citations.length} 条引用` : "尚未选择资料"}</h2>
          {selectedDocument && !route.target ? <p>当前为只读入口。请从命盘字段、研究笔记或真实事件进入，建立带目标的候选引用。</p> : null}
          <div className="knowledge-citation-list">
            {citations.map((citation) => <article className={selectedCitation?.id === citation.id ? "is-active" : ""} key={citation.id}>
              <header><StatusPill tone="warning">用户候选</StatusPill><small>{formatDate(citation.updatedAt)}</small></header>
              <AppLink aria-current={selectedCitation?.id === citation.id ? "location" : undefined} href={documentHref(route, selectedDocument!, { sectionId: citation.locator.sectionId, lineNumber: citation.locator.startLine, citationId: citation.id })}><blockquote>{citation.quote}</blockquote></AppLink>
              {citation.annotation ? <p>{citation.annotation}</p> : null}
              <ul>{citation.targets.map((target, index) => <li key={`${target.kind}:${index}`}>{citationTargetLabel(target)}</li>)}</ul>
              <button type="button" className="text-danger-action" onClick={() => void deleteCitation(citation)}><Trash2 aria-hidden="true" />删除引用</button>
            </article>)}
          </div>
          {selectedDocument && !citations.length ? <p>这份资料还没有结构化引用；旧 sourceRefs 仍会在原位置保留。</p> : null}
        </aside>
      </div>
      </>}
    </div>
  );
}
