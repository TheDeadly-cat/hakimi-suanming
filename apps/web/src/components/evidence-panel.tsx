import { BookOpen, Calculator, CircleHelp, GitCompareArrows, Link2, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { citationRecordSchema, type CitationRecord, type PillarFact, type RevisionRecord } from "@hakimi/contracts";
import { evidenceSubjectIdForField } from "@hakimi/knowledge-core";
import { knowledgeRepository } from "@hakimi/storage";
import { buildKnowledgeSearch, knowledgeChartFieldHref, knowledgeEvidenceSubjectHref } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { StatusPill, type StatusPillTone } from "./status-pill";
import { isKnownMatrixSelection, matrixFieldLabel, matrixValue, type MatrixSelection } from "./four-pillars-matrix";
import "./chart-evidence-surfaces.css";

type FieldProvenance = RevisionRecord["facts"]["fieldProvenance"][number];
type Citation = CitationRecord;
type CitationChannelState = "idle" | "loading" | "loaded" | "error" | "not_applicable";
type CitationChannel = {
  state: CitationChannelState;
  count: number;
  error: string | null;
};
type CitationChannels = {
  field: CitationChannel;
  subject: CitationChannel;
};
type CitationLoadResult = { ok: true; citations: Citation[] } | { ok: false; error: string };
type CitationMergeResult = { citations: Citation[]; error: string | null };

const provenanceKindLabels: Record<FieldProvenance["kind"], string> = {
  calendar_fact: "历法事实",
  rule_derived: "规则推导",
  interpretive_claim: "解释观点",
  ai_expression: "AI 表达"
};

const verificationStatusLabels: Record<FieldProvenance["verificationStatus"], string> = {
  gold_verified: "上游记录：金标状态",
  adjudicated: "上游记录：已裁定",
  disputed: "有争议",
  experimental: "实验"
};

const verificationStatusTones: Record<FieldProvenance["verificationStatus"], StatusPillTone> = {
  gold_verified: "info",
  adjudicated: "info",
  disputed: "cinnabar",
  experimental: "warning"
};

const citationStatusLabels: Record<Citation["status"], string> = {
  verified: "引用记录已复核",
  user_candidate: "用户候选",
  rejected: "已拒绝"
};

const compactEvidenceQuery = "(max-width: 1099px)";
const provenanceKindIds = new Set<string>(Object.keys(provenanceKindLabels));
const verificationStatusIds = new Set<string>(Object.keys(verificationStatusLabels));
const citationStatusIds = new Set<string>(Object.keys(citationStatusLabels));
const unsafeEvidenceTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const unsafeEvidenceTextGlobalPattern = new RegExp(unsafeEvidenceTextPattern.source, "gu");
const sensitiveEvidenceFailurePattern = /((?:api[-_ ]?key|authorization|access[-_ ]?token|refresh[-_ ]?token|secret|password)\s*[:=]\s*)[^\s,;]+/giu;
const bearerCredentialPattern = /\bbearer\s+[a-z0-9._~+/=-]{8,}/giu;
const maximumCitationsPerChannel = 250;
const maximumCitationIdCharacters = 512;
const maximumCitationQuoteCharacters = 12_000;
const maximumCitationTargets = 64;
const maximumCitationTargetSnapshotCharacters = 4_096;
const maximumRenderedCitations = 50;
const maximumRenderedCitationQuoteCharacters = 1_200;
const maximumLegacySourceRefsPerProvenance = 250;

const EVIDENCE_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
} as const;

const evidenceReleaseBoundary = (
  <div className="evidence-release-strip" role="group" aria-label="当前字段依据发布与写入边界">
    <span>legacy-v13</span>
    <span>Schema 13</span>
    <span>migration null</span>
    <span>只读</span>
  </div>
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeEvidenceDisplayText(value: unknown, fallback: string, maxCodePoints = 600): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .replace(unsafeEvidenceTextGlobalPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return Array.from(normalized).slice(0, maxCodePoints).join("") || fallback;
}

function visibleCitationQuote(value: string): { text: string; truncated: boolean } {
  const characters = Array.from(value);
  if (characters.length <= maximumRenderedCitationQuoteCharacters) {
    return { text: value, truncated: false };
  }
  return {
    text: `${characters.slice(0, maximumRenderedCitationQuoteCharacters).join("")}…`,
    truncated: true,
  };
}

function redactEvidenceFailureText(value: string): string {
  return value
    .replace(sensitiveEvidenceFailurePattern, "$1[已遮蔽]")
    .replace(bearerCredentialPattern, "Bearer [已遮蔽]");
}

function visibleCitationFailure(reason: unknown, fallback: string): string {
  let value = reason;
  try {
    if (reason instanceof Error) value = reason.message;
  } catch {
    value = undefined;
  }
  const normalized = redactEvidenceFailureText(typeof value === "string" ? value : fallback)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return Array.from(normalized || fallback).slice(0, 512).join("");
}

function safeJsonSnapshot(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null;
  } catch {
    return null;
  }
}

function validCitationTimestamp(value: unknown): value is string {
  if (!isNonEmptyString(value) || unsafeEvidenceTextPattern.test(value)) return false;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u.exec(value);
  if (!match) return false;
  const canonical = `${match[1]}.${(match[2] ?? "0").padEnd(3, "0")}Z`;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === canonical;
}

function compactEvidenceViewport(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.matchMedia === "function"
    ? window.matchMedia(compactEvidenceQuery).matches
    : window.innerWidth <= 1099;
}

function createCitationChannels(state: "idle" | "loading", hasSubject: boolean): CitationChannels {
  return {
    field: { state, count: 0, error: null },
    subject: {
      state: hasSubject ? state : "not_applicable",
      count: 0,
      error: null
    }
  };
}

function captureCitationLoad(operation: () => Promise<Citation[]>, fallback: string): Promise<CitationLoadResult> {
  return Promise.resolve()
    .then(operation)
    .then((citations) => ({ ok: true as const, citations }))
    .catch((reason: unknown) => ({
      ok: false as const,
      error: visibleCitationFailure(reason, fallback)
    }));
}

function validateCitationChannel(
  result: CitationLoadResult,
  channelLabel: string,
  targetMatches: (citation: Citation) => boolean
): CitationLoadResult {
  if (!result.ok) return result;
  if (!Array.isArray(result.citations)) {
    return { ok: false, error: `${channelLabel}没有返回可核对的引用列表。` };
  }
  if (result.citations.length > maximumCitationsPerChannel) {
    return { ok: false, error: `${channelLabel}返回超过 ${maximumCitationsPerChannel} 条引用，当前通道已拒绝不完整截断。` };
  }
  const ids = new Set<string>();
  const validatedCitations: Citation[] = [];
  for (const rawCitation of result.citations) {
    let validation: ReturnType<typeof citationRecordSchema.safeParse>;
    try {
      validation = citationRecordSchema.safeParse(rawCitation);
    } catch {
      return { ok: false, error: `${channelLabel}返回了无法按当前 Citation 契约读取的记录。` };
    }
    if (!validation.success) {
      return { ok: false, error: `${channelLabel}返回了没有通过当前 Citation 契约的记录。` };
    }
    const citation = validation.data;
    if (!isNonEmptyString(citation.id)) {
      return { ok: false, error: `${channelLabel}返回了空引用 ID，当前通道已失败关闭。` };
    }
    if (ids.has(citation.id)) {
      return { ok: false, error: `${channelLabel}返回了重复引用 ID ${shortEvidenceBinding(citation.id)}，当前通道已失败关闭。` };
    }
    ids.add(citation.id);
    if (!citationStatusIds.has(citation.status)) {
      return { ok: false, error: `${channelLabel}返回的引用状态不受支持，当前通道已失败关闭。` };
    }
    if (
      !isNonEmptyString(citation.documentId)
      || !isNonEmptyString(citation.quote)
      || citation.id !== citation.id.trim()
      || citation.documentId !== citation.documentId.trim()
      || Array.from(citation.id).length > maximumCitationIdCharacters
      || Array.from(citation.documentId).length > maximumCitationIdCharacters
      || Array.from(citation.quote).length > maximumCitationQuoteCharacters
      || [citation.id, citation.documentId, citation.quote].some((value) => unsafeEvidenceTextPattern.test(value))
      || !validCitationTimestamp(citation.updatedAt)
      || !isNonEmptyString(citation.locator?.sectionId)
      || citation.locator.sectionId !== citation.locator.sectionId.trim()
      || Array.from(citation.locator.sectionId).length > maximumCitationIdCharacters
      || unsafeEvidenceTextPattern.test(citation.locator.sectionId)
      || !Number.isSafeInteger(citation.locator.startLine)
      || citation.locator.startLine <= 0
      || !Number.isSafeInteger(citation.locator.endLine)
      || citation.locator.endLine < citation.locator.startLine
      || !Array.isArray(citation.targets)
      || citation.targets.length === 0
      || citation.targets.length > maximumCitationTargets
      || citation.targets.some((target) => target === null || typeof target !== "object" || Array.isArray(target))
    ) {
      return { ok: false, error: `${channelLabel}返回的引用 ${shortEvidenceBinding(citation.id)} 缺少安全文档、摘录、有效 UTC 时间、定位行号或目标。` };
    }
    const targetKeys = citation.targets.map(safeJsonSnapshot);
    if (targetKeys.some((key) => key === null)) {
      return { ok: false, error: `${channelLabel}返回了无法序列化核对的引用目标。` };
    }
    if (targetKeys.some((key) => Array.from(key ?? "").length > maximumCitationTargetSnapshotCharacters)) {
      return { ok: false, error: `${channelLabel}返回了超过显示核对上限的引用目标快照。` };
    }
    if (targetKeys.some((key) => unsafeEvidenceTextPattern.test(key ?? ""))) {
      return { ok: false, error: `${channelLabel}返回了包含不可见控制字符的引用目标快照。` };
    }
    if (new Set(targetKeys).size !== targetKeys.length) {
      return { ok: false, error: `${channelLabel}返回的引用 ${shortEvidenceBinding(citation.id)} 重复登记了同一目标。` };
    }
    if (!targetMatches(citation)) {
      return { ok: false, error: `${channelLabel}返回了未反向绑定本次请求目标的引用 ${shortEvidenceBinding(citation.id)}。` };
    }
    validatedCitations.push(citation);
  }
  return { ok: true, citations: validatedCitations };
}

function mergeCitationChannels(channelCitations: readonly Citation[][]): CitationMergeResult {
  const byId = new Map<string, Citation>();
  for (const citations of channelCitations) {
    for (const citation of citations) {
      const current = byId.get(citation.id);
      const currentSnapshot = current ? safeJsonSnapshot(current) : null;
      const nextSnapshot = safeJsonSnapshot(citation);
      if (!nextSnapshot || (current && !currentSnapshot)) {
        return {
          citations: [],
          error: "字段与主题通道返回了无法序列化核对的引用快照。"
        };
      }
      if (currentSnapshot && currentSnapshot !== nextSnapshot) {
        return {
          citations: [],
          error: `引用 ${shortEvidenceBinding(citation.id)} 在字段与主题通道中返回了不同快照；系统已拒绝择一覆盖。`
        };
      }
      byId.set(citation.id, citation);
    }
  }
  return {
    citations: [...byId.values()].sort((left, right) => (
      right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
    )),
    error: null
  };
}

function citationChannelDetail(channel: CitationChannel): string {
  if (channel.state === "loading") return "读取中";
  if (channel.state === "loaded") return `${channel.count} 条`;
  if (channel.state === "error") return "读取失败";
  if (channel.state === "not_applicable") return "当前字段未注册通用主题";
  return "未读取";
}

function shortEvidenceBinding(value: unknown): string {
  if (!isNonEmptyString(value)) return "无有效标识";
  const normalized = value
    .replace(unsafeEvidenceTextGlobalPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return "无有效标识";
  const characters = Array.from(normalized);
  return characters.length > 24
    ? `${characters.slice(0, 12).join("")}…${characters.slice(-8).join("")}`
    : normalized;
}

const evidencePillarLabels: Record<keyof RevisionRecord["facts"]["pillars"], string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
};

type EvidenceBindingInspection =
  | Readonly<{
      state: "error";
      issue: string;
    }>
  | Readonly<{
      state: "bound";
      selection: MatrixSelection;
      pillar: PillarFact;
      value: string;
      requestedProvenanceField: string;
      matchingProvenance: readonly FieldProvenance[];
    }>;

function inspectEvidenceBinding(revision: RevisionRecord, selection: MatrixSelection): EvidenceBindingInspection {
  if (!isKnownMatrixSelection(selection)) {
    return { state: "error", issue: "当前选择没有绑定受支持的四柱矩阵字段" };
  }
  if (!revision || typeof revision !== "object" || Array.isArray(revision)) {
    return { state: "error", issue: "当前 Revision 不是可核对对象" };
  }

  const revisionRecord = revision as unknown as Record<string, unknown>;
  if (
    !isNonEmptyString(revisionRecord.caseId)
    || revisionRecord.caseId !== revisionRecord.caseId.trim()
    || unsafeEvidenceTextPattern.test(revisionRecord.caseId)
    || Array.from(revisionRecord.caseId).length > maximumCitationIdCharacters
    || !isNonEmptyString(revisionRecord.id)
    || revisionRecord.id !== revisionRecord.id.trim()
    || unsafeEvidenceTextPattern.test(revisionRecord.id)
    || Array.from(revisionRecord.id).length > maximumCitationIdCharacters
  ) {
    return { state: "error", issue: "当前 Revision 缺少规范 Case 或 Revision 标识" };
  }

  const facts = revisionRecord.facts;
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    return { state: "error", issue: "当前 Revision 缺少可核对的事实对象" };
  }
  const factsRecord = facts as Record<string, unknown>;
  const pillars = factsRecord.pillars;
  if (!pillars || typeof pillars !== "object" || Array.isArray(pillars)) {
    return { state: "error", issue: "当前 Revision 缺少四柱事实对象" };
  }
  const pillar = (pillars as Record<string, unknown>)[selection.pillar];
  if (!pillar || typeof pillar !== "object" || Array.isArray(pillar)) {
    return { state: "error", issue: `${evidencePillarLabels[selection.pillar]}缺少可核对的柱事实` };
  }
  if ((pillar as Record<string, unknown>).label !== evidencePillarLabels[selection.pillar]) {
    return { state: "error", issue: `${selection.pillar} 键没有绑定固定柱标签` };
  }
  if (!Array.isArray(factsRecord.fieldProvenance)) {
    return { state: "error", issue: "当前 Revision 缺少可核对的字段来源列表" };
  }

  const manifest = revisionRecord.manifest;
  const ruleProfile = revisionRecord.ruleProfile;
  if (
    !manifest
    || typeof manifest !== "object"
    || Array.isArray(manifest)
    || !(manifest as Record<string, unknown>).engine
    || typeof (manifest as Record<string, unknown>).engine !== "object"
    || Array.isArray((manifest as Record<string, unknown>).engine)
    || !ruleProfile
    || typeof ruleProfile !== "object"
    || Array.isArray(ruleProfile)
    || !(ruleProfile as Record<string, unknown>).calendar
    || typeof (ruleProfile as Record<string, unknown>).calendar !== "object"
    || Array.isArray((ruleProfile as Record<string, unknown>).calendar)
  ) {
    return { state: "error", issue: "当前 Revision 缺少引擎或历法规则绑定" };
  }
  const manifestRecord = manifest as Record<string, unknown>;
  const engineRecord = manifestRecord.engine as Record<string, unknown>;
  const calendarRecord = (ruleProfile as Record<string, unknown>).calendar as Record<string, unknown>;
  const bindingTexts = [
    engineRecord.name,
    engineRecord.version,
    manifestRecord.resultHash,
    manifestRecord.ruleProfileDigest
  ];
  if (bindingTexts.some((value) => (
    !isNonEmptyString(value)
    || value !== value.trim()
    || unsafeEvidenceTextPattern.test(value)
    || Array.from(value).length > maximumCitationIdCharacters
  ))) {
    return { state: "error", issue: "当前 Revision 的引擎或摘要绑定不可识别" };
  }
  if (calendarRecord.dayBoundary !== "zi_start_23" && calendarRecord.dayBoundary !== "midnight_00") {
    return { state: "error", issue: "当前 Revision 的换日规则不可识别" };
  }

  const requestedProvenanceField = `pillars.${selection.pillar}.${selection.field === "stem" || selection.field === "branch" ? "ganZhi" : selection.field}`;
  const matchingProvenance: FieldProvenance[] = [];
  for (const candidate of factsRecord.fieldProvenance) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const record = candidate as Record<string, unknown>;
    if (record.field !== requestedProvenanceField) continue;
    if (
      typeof record.kind !== "string"
      || !provenanceKindIds.has(record.kind)
      || typeof record.verificationStatus !== "string"
      || !verificationStatusIds.has(record.verificationStatus)
      || !Array.isArray(record.sourceRefs)
      || record.sourceRefs.length > maximumLegacySourceRefsPerProvenance
      || record.sourceRefs.some((source) => (
        typeof source !== "string"
        || unsafeEvidenceTextPattern.test(source)
        || Array.from(source).length > maximumCitationIdCharacters
      ))
      || (record.algorithmId !== undefined && (
        typeof record.algorithmId !== "string"
        || unsafeEvidenceTextPattern.test(record.algorithmId)
        || Array.from(record.algorithmId).length > maximumCitationIdCharacters
      ))
      || (record.note !== undefined && (
        typeof record.note !== "string"
        || unsafeEvidenceTextPattern.test(record.note)
        || Array.from(record.note).length > maximumCitationQuoteCharacters
      ))
    ) {
      return { state: "error", issue: "当前字段的 provenance 记录不符合安全展示契约" };
    }
    matchingProvenance.push(candidate as FieldProvenance);
  }

  let value: string;
  try {
    value = matrixValue(pillar as PillarFact, selection.field);
  } catch {
    return { state: "error", issue: "当前字段值无法按登记矩阵规则安全读取" };
  }

  return {
    state: "bound",
    selection,
    pillar: pillar as PillarFact,
    value,
    requestedProvenanceField,
    matchingProvenance,
  };
}

export function EvidencePanel({ revision, selection, open, onClose }: { revision: RevisionRecord; selection: MatrixSelection; open: boolean; onClose: () => void }) {
  const panelTitleId = useId();
  const panelBoundaryId = useId();
  const contextTitleId = useId();
  const sourcesTitleId = useId();
  const evidenceBinding = useMemo(() => inspectEvidenceBinding(revision, selection), [revision, selection]);
  const requestedProvenanceField = evidenceBinding.state === "bound" ? evidenceBinding.requestedProvenanceField : "";
  const matchingProvenance = evidenceBinding.state === "bound" ? evidenceBinding.matchingProvenance : [];
  const provenance = matchingProvenance.length === 1 ? matchingProvenance[0] : null;
  const provenanceConflict = matchingProvenance.length > 1;
  const evidenceSubjectId = evidenceBinding.state === "bound"
    ? evidenceSubjectIdForField(requestedProvenanceField)
    : null;
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationMergeError, setCitationMergeError] = useState<string | null>(null);
  const [citationChannels, setCitationChannels] = useState<CitationChannels>(() => (
    createCitationChannels("idle", Boolean(evidenceSubjectId))
  ));
  const [compact, setCompact] = useState(compactEvidenceViewport);
  const [citationRetryVersion, setCitationRetryVersion] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const citationRequestKey = evidenceBinding.state !== "bound" || (compact && !open)
    ? null
    : JSON.stringify({
        caseId: revision.caseId,
        revisionId: revision.id,
        field: requestedProvenanceField,
        evidenceSubjectId,
        retryVersion: citationRetryVersion
      });
  const [activeCitationKey, setActiveCitationKey] = useState<string | null>(citationRequestKey);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia(compactEvidenceQuery)
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

  useEffect(() => {
    if (!compact || !open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const focusableElements = () => panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
        element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden")
      ))
      : [];

    document.body.style.overflow = "hidden";
    panel?.focus({ preventScroll: true });
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === panel || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [compact, open]);

  useEffect(() => {
    if (!citationRequestKey) {
      setActiveCitationKey(null);
      setCitations([]);
      setCitationMergeError(null);
      setCitationChannels(createCitationChannels("idle", Boolean(evidenceSubjectId)));
      return;
    }
    let active = true;
    setActiveCitationKey(citationRequestKey);
    setCitations([]);
    setCitationMergeError(null);
    setCitationChannels(createCitationChannels("loading", Boolean(evidenceSubjectId)));
    const fieldTarget = {
      kind: "chart_field" as const,
      caseId: revision.caseId,
      revisionId: revision.id,
      field: requestedProvenanceField
    };
    const fieldRequest = captureCitationLoad(
      () => knowledgeRepository.listCitationsByTarget(fieldTarget),
      "当前字段的结构化引用读取失败。"
    );
    const subjectRequest = evidenceSubjectId
      ? captureCitationLoad(
          () => knowledgeRepository.listCitationsByTarget({ kind: "evidence_subject", subjectId: evidenceSubjectId }),
          "通用证据主题引用读取失败。"
        )
      : Promise.resolve({ ok: true as const, citations: [] });
    void Promise.all([fieldRequest, subjectRequest]).then(([fieldResult, subjectResult]) => {
      if (!active) return;
      const checkedFieldResult = validateCitationChannel(
        fieldResult,
        "字段绑定通道",
        (citation) => citation.targets.some((target) => (
          target.kind === "chart_field"
          && target.caseId === fieldTarget.caseId
          && target.revisionId === fieldTarget.revisionId
          && target.field === fieldTarget.field
        ))
      );
      const checkedSubjectResult = evidenceSubjectId
        ? validateCitationChannel(
            subjectResult,
            "主题共享通道",
            (citation) => citation.targets.some((target) => (
              target.kind === "evidence_subject" && target.subjectId === evidenceSubjectId
            ))
          )
        : subjectResult;
      const merged = mergeCitationChannels([
        checkedFieldResult.ok ? checkedFieldResult.citations : [],
        checkedSubjectResult.ok ? checkedSubjectResult.citations : []
      ]);
      setCitations(merged.citations);
      setCitationMergeError(merged.error);
      setCitationChannels({
        field: checkedFieldResult.ok
          ? { state: "loaded", count: checkedFieldResult.citations.length, error: null }
          : { state: "error", count: 0, error: checkedFieldResult.error },
        subject: !evidenceSubjectId
          ? { state: "not_applicable", count: 0, error: null }
          : checkedSubjectResult.ok
            ? { state: "loaded", count: checkedSubjectResult.citations.length, error: null }
            : { state: "error", count: 0, error: checkedSubjectResult.error }
      });
    }).catch((reason: unknown) => {
      if (!active) return;
      const message = visibleCitationFailure(reason, "结构化引用校验未完成，当前索引已失败关闭。");
      setCitations([]);
      setCitationMergeError(message);
      setCitationChannels({
        field: { state: "error", count: 0, error: message },
        subject: evidenceSubjectId
          ? { state: "error", count: 0, error: message }
          : { state: "not_applicable", count: 0, error: null }
      });
    });
    return () => { active = false; };
  }, [citationRequestKey, evidenceSubjectId, requestedProvenanceField, revision.caseId, revision.id]);

  const citationCurrent = activeCitationKey === citationRequestKey;
  const visibleCitationChannels = citationCurrent
    ? citationChannels
    : createCitationChannels("loading", Boolean(evidenceSubjectId));
  const visibleCitationLoading = citationRequestKey !== null && (
    !citationCurrent
    || visibleCitationChannels.field.state === "idle"
    || visibleCitationChannels.subject.state === "idle"
    || visibleCitationChannels.field.state === "loading"
    || visibleCitationChannels.subject.state === "loading"
  );
  const citationPresentation = useMemo(() => {
    const visible = citationCurrent ? citations : [];
    let verifiedCount = 0;
    let candidateCount = 0;
    let rejectedCount = 0;
    for (const citation of visible) {
      if (citation.status === "verified") verifiedCount += 1;
      else if (citation.status === "user_candidate") candidateCount += 1;
      else if (citation.status === "rejected") rejectedCount += 1;
    }
    const rendered = visible.slice(0, maximumRenderedCitations);
    return {
      visible,
      rendered,
      omittedCount: visible.length - rendered.length,
      verifiedCount,
      candidateCount,
      rejectedCount,
    };
  }, [citationCurrent, citations]);
  const visibleCitations = citationPresentation.visible;
  const renderedCitations = citationPresentation.rendered;
  const omittedRenderedCitationCount = citationPresentation.omittedCount;
  const visibleCitationMergeError = citationCurrent ? citationMergeError : null;
  const verifiedCitationCount = citationPresentation.verifiedCount;
  const candidateCitationCount = citationPresentation.candidateCount;
  const rejectedCitationCount = citationPresentation.rejectedCount;
  const visibleCitationErrors: Array<{ key: "field" | "subject" | "merge"; label: string; message: string }> = [];
  if (citationCurrent && citationChannels.field.error) {
    visibleCitationErrors.push({ key: "field", label: "字段绑定", message: citationChannels.field.error });
  }
  if (citationCurrent && citationChannels.subject.error) {
    visibleCitationErrors.push({ key: "subject", label: "主题共享", message: citationChannels.subject.error });
  }
  if (visibleCitationMergeError) {
    visibleCitationErrors.push({ key: "merge", label: "跨通道快照", message: visibleCitationMergeError });
  }
  const citationIndexComplete = citationCurrent
    && !visibleCitationLoading
    && !visibleCitationMergeError
    && citationChannels.field.state === "loaded"
    && (citationChannels.subject.state === "loaded" || citationChannels.subject.state === "not_applicable");
  const provenanceState = provenanceConflict ? "conflict" : provenance ? "bound" : "missing";
  const citationIndexState = visibleCitationLoading ? "loading" : citationIndexComplete ? "complete" : "incomplete";
  const legacySourcePresentation = useMemo(() => {
    const all = provenance && Array.isArray(provenance.sourceRefs)
      ? [...new Set(provenance.sourceRefs
          .map((source) => safeEvidenceDisplayText(source, "", 512))
          .filter((source) => source.length > 0))]
      : [];
    const rendered = all.slice(0, 50);
    return { all, rendered, omittedCount: all.length - rendered.length };
  }, [provenance]);
  const allLegacySourceRefs = legacySourcePresentation.all;
  const legacySourceRefs = legacySourcePresentation.rendered;
  const omittedLegacySourceRefCount = legacySourcePresentation.omittedCount;

  const retryCitations = () => {
    setCitations([]);
    setCitationMergeError(null);
    setCitationChannels(createCitationChannels("loading", Boolean(evidenceSubjectId)));
    setCitationRetryVersion((current) => current + 1);
  };

  if (compact && !open) return null;

  if (evidenceBinding.state !== "bound") {
    return (
      <aside
        ref={panelRef}
        className={`evidence-panel ${open ? "is-open" : ""}`}
        role={compact && open ? "dialog" : undefined}
        aria-modal={compact && open ? "true" : undefined}
        aria-labelledby={panelTitleId}
        aria-describedby={panelBoundaryId}
        tabIndex={compact && open ? -1 : undefined}
        data-provenance-state="missing"
        data-citation-index-state="incomplete"
        data-citation-index-scope="current-request-only"
        data-citation-index-completeness-proven="false"
        data-citation-record-schema="citationRecordSchema"
        data-citation-record-schema-validation="not_run"
        data-returned-citation-count="0"
        data-rendered-citation-count="0"
        data-binding-state="error"
        {...EVIDENCE_SAFETY_ATTRIBUTES}
      >
        <div className="evidence-drag-handle" aria-hidden="true" />
        <header className="evidence-header">
          <div>
            <p className="eyebrow">FIELD EVIDENCE / 字段依据</p>
            <h2 id={panelTitleId}>字段依据未展示</h2>
            <p id={panelBoundaryId} className="evidence-boundary">{evidenceBinding.issue}。系统未加载替代字段、相邻柱或近似来源。</p>
            {evidenceReleaseBoundary}
          </div>
          <button type="button" className="icon-button evidence-close" onClick={onClose} aria-label="关闭未绑定字段依据面板"><X aria-hidden="true" /></button>
        </header>
        <div className="evidence-sections">
          <div className="matrix-binding-failure" role="alert">
            <strong>证据侧栏保持失败关闭</strong>
            <p>请先在四柱结构矩阵中选择一个有效单元格；当前没有借用年柱十神或其他邻近字段进行近似恢复。</p>
          </div>
        </div>
      </aside>
    );
  }

  const { selection: boundSelection, pillar, value } = evidenceBinding;
  const citationTarget = {
    kind: "chart_field" as const,
    caseId: revision.caseId,
    revisionId: revision.id,
    field: requestedProvenanceField
  };

  return (
    <aside
      ref={panelRef}
      className={`evidence-panel ${open ? "is-open" : ""}`}
      role={compact && open ? "dialog" : undefined}
      aria-modal={compact && open ? "true" : undefined}
      aria-labelledby={panelTitleId}
      aria-describedby={panelBoundaryId}
      tabIndex={compact && open ? -1 : undefined}
      data-provenance-state={provenanceState}
      data-citation-index-state={citationIndexState}
      data-citation-index-scope="current-request-only"
      data-citation-index-completeness-proven="false"
      data-citation-record-schema="citationRecordSchema"
      data-citation-record-schema-validation={visibleCitationLoading ? "pending" : citationIndexComplete ? "complete" : "incomplete"}
      data-returned-citation-count={visibleCitations.length}
      data-rendered-citation-count={renderedCitations.length}
      data-binding-state="bound"
      data-selected-pillar={boundSelection.pillar}
      data-selected-field={boundSelection.field}
      data-field-value-state={value === "—" ? "missing" : "present"}
      {...EVIDENCE_SAFETY_ATTRIBUTES}
    >
      <div className="evidence-drag-handle" aria-hidden="true" />
      <header className="evidence-header">
        <div>
          <p className="eyebrow">FIELD EVIDENCE / 字段依据</p>
          <h2 id={panelTitleId}>{pillar.label} · {matrixFieldLabel(boundSelection.field)}</h2>
          <p className="evidence-value" dir="auto">{value}</p>
          <p id={panelBoundaryId} className="evidence-boundary">只描述字段计算与来源状态，不构成专家真值、吉凶结论或公开发布授权。</p>
          {evidenceReleaseBoundary}
        </div>
        <button type="button" className="icon-button evidence-close" onClick={onClose} aria-label={`关闭${pillar.label}${matrixFieldLabel(boundSelection.field)}依据面板`}><X aria-hidden="true" /></button>
      </header>
      <div className="evidence-sections">
        <section className="evidence-context-ledger" aria-labelledby={contextTitleId}>
          <header>
            <div><p className="eyebrow">FIELD BINDING / 字段绑定</p><h3 id={contextTitleId}>当前字段绑定账本</h3></div>
            <StatusPill tone={provenanceConflict ? "cinnabar" : provenance ? "info" : "warning"}>{provenanceConflict ? "来源记录冲突" : provenance ? "来源记录已绑定" : "字段来源缺口"}</StatusPill>
          </header>
          <dl>
            <div><dt>Case</dt><dd><code title={safeEvidenceDisplayText(revision.caseId, "", 512)}>{shortEvidenceBinding(revision.caseId)}</code></dd></div>
            <div><dt>Revision</dt><dd><code title={safeEvidenceDisplayText(revision.id, "", 512)}>{shortEvidenceBinding(revision.id)}</code></dd></div>
            <div><dt>字段路径</dt><dd><code title={requestedProvenanceField}>{requestedProvenanceField}</code></dd></div>
            <div><dt>provenance 记录</dt><dd>{matchingProvenance.length} 条{provenanceConflict ? " · 拒绝择一" : ""}</dd></div>
            <div><dt>证据主题</dt><dd><code title={evidenceSubjectId ?? undefined}>{evidenceSubjectId ?? "未注册通用主题"}</code></dd></div>
            <div><dt>排盘结果摘要</dt><dd><code title={safeEvidenceDisplayText(revision.manifest.resultHash, "", 512)}>{shortEvidenceBinding(revision.manifest.resultHash)}</code></dd></div>
            <div><dt>规则档案摘要</dt><dd><code title={safeEvidenceDisplayText(revision.manifest.ruleProfileDigest, "", 512)}>{shortEvidenceBinding(revision.manifest.ruleProfileDigest)}</code></dd></div>
            <div><dt>发布基线</dt><dd>legacy-v13 · Schema 13 · migration null</dd></div>
          </dl>
          <p>{provenanceConflict ? `当前字段存在 ${matchingProvenance.length} 条 provenance，无法建立唯一上游绑定；provenance 验证状态与算法说明保持关闭。` : "账本仅证明侧栏选择与当前工程记录一致；provenance 状态、引用记录状态和引用通道结果仍分别展示，互不替代。"}</p>
        </section>
        <div className="evidence-chain-rail" role="group" aria-label="当前字段证据链状态">
          <div data-state="bound"><span>01 · 当前选择</span><strong>{pillar.label} · {matrixFieldLabel(boundSelection.field)}</strong><small dir="auto">{value === "—" ? "字段值未提供" : value}</small></div>
          <div data-state={provenanceState}><span>02 · 上游记录</span><strong>{provenanceConflict ? `${matchingProvenance.length} 条冲突` : provenance ? "唯一 provenance" : "暂无直接记录"}</strong><small>{provenanceConflict ? "拒绝择一" : provenance ? verificationStatusLabels[provenance.verificationStatus] : "不借用其他字段"}</small></div>
          <div data-state={citationIndexState}><span>03 · 引用通道</span><strong>{visibleCitationLoading ? "读取中" : citationIndexComplete ? "本次通道读取完成" : "通道读取不完整"}</strong><small>{citationChannelDetail(visibleCitationChannels.field)} · {citationChannelDetail(visibleCitationChannels.subject)}</small></div>
          <div data-state={verifiedCitationCount > 0 ? "verified" : citationIndexComplete ? "missing" : "incomplete"}><span>04 · 引用复核</span><strong>{verifiedCitationCount} 条 verified</strong><small>{citationIndexComplete ? "仅表示本次返回记录状态" : "当前不是完整返回范围"}</small></div>
          <p>链路闭合只证明当前工程选择、上游记录和引用索引能够互相定位，不证明来源充分、术数规则正确或专家真值成立。</p>
        </div>
        <section className="evidence-section evidence-section--calculation">
          <div className="evidence-title"><Calculator aria-hidden="true" /><h3>工程计算</h3><StatusPill tone={provenanceConflict ? "cinnabar" : provenance ? verificationStatusTones[provenance.verificationStatus] : "warning"}>{provenanceConflict ? "上游记录冲突" : provenance ? verificationStatusLabels[provenance.verificationStatus] : "待补证据"}</StatusPill></div>
          <dl className="evidence-ledger">
            <div><dt>字段</dt><dd>{requestedProvenanceField}</dd></div>
            <div><dt>类型</dt><dd>{provenanceConflict ? "多条记录冲突" : provenance ? provenanceKindLabels[provenance.kind] : "暂无直接来源"}</dd></div>
            <div><dt>算法</dt><dd>{provenanceConflict ? "拒绝从多条记录中择一" : safeEvidenceDisplayText(provenance?.algorithmId, "待补证据", 160)}</dd></div>
            <div><dt>引擎</dt><dd>{safeEvidenceDisplayText(revision.manifest.engine.name, "引擎未登记", 120)} {safeEvidenceDisplayText(revision.manifest.engine.version, "版本未登记", 80)}</dd></div>
          </dl>
          <p dir="auto">{provenanceConflict ? `检测到 ${matchingProvenance.length} 条同字段 provenance；系统不会用数组顺序决定验证状态或算法身份。` : safeEvidenceDisplayText(provenance?.note, "当前字段暂无直接证据记录；系统不会借用干支字段的算法或来源。", 2_000)}</p>
        </section>
        <section className="evidence-section evidence-section--interpretation">
          <div className="evidence-title"><GitCompareArrows aria-hidden="true" /><h3>解释边界</h3></div>
          <p>此面板只展示确定性候选结构的工程记录；旺衰与十神请到“概览”查看 0.1.0 规则候选，格局、调候与用神仍未下结论。日柱按“{revision.ruleProfile.calendar.dayBoundary === "zi_start_23" ? "23:00 子初换日" : "00:00 午夜换日"}”计算。</p>
        </section>
        <section className="evidence-section evidence-section--sources" aria-labelledby={sourcesTitleId} aria-busy={visibleCitationLoading}>
          <div className="evidence-title"><BookOpen aria-hidden="true" /><h3 id={sourcesTitleId}>结构化引用</h3></div>
          <p className="evidence-source-boundary" role="note">两条通道返回的记录会先通过当前 Citation schema，再核对请求目标与跨通道快照；`verified` 只表示引用记录完成既定复核流程，不自动证明现实专家身份、原文版本充分、术数规则正确或公开发布授权。</p>
          <div className="evidence-citation-channels" role="group" aria-label="引用通道状态" aria-live="polite">
            <div data-state={visibleCitationChannels.field.state}><span>字段绑定</span><strong>{citationChannelDetail(visibleCitationChannels.field)}</strong></div>
            <div data-state={visibleCitationChannels.subject.state}><span>主题共享</span><strong>{citationChannelDetail(visibleCitationChannels.subject)}</strong></div>
          </div>
          {visibleCitationLoading ? <div className="evidence-source-loading" role="status"><span aria-hidden="true" /><p>正在读取本字段的引用通道…</p></div> : null}
          {!visibleCitationLoading ? <div className="evidence-citation-summary" role="group" aria-label="当前已返回引用状态汇总">
            <div data-status={citationIndexComplete ? "complete" : "partial"}><span>通道读取</span><strong>{citationIndexComplete ? "完成" : "不完整"}</strong></div>
            <div data-status="verified"><span>引用已复核</span><strong>{verifiedCitationCount} 条</strong></div>
            <div data-status="candidate"><span>用户候选</span><strong>{candidateCitationCount} 条</strong></div>
            <div data-status="rejected"><span>已拒绝</span><strong>{rejectedCitationCount} 条</strong></div>
          </div> : null}
          {!visibleCitationLoading && visibleCitations.length ? <div className="structured-citation-list">
            {renderedCitations.map((citation) => {
              const fieldBound = citation.targets.some((target) => (
                target.kind === "chart_field"
                && target.caseId === citationTarget.caseId
                && target.revisionId === citationTarget.revisionId
                && target.field === citationTarget.field
              ));
              const subjectBound = Boolean(evidenceSubjectId && citation.targets.some((target) => (
                target.kind === "evidence_subject" && target.subjectId === evidenceSubjectId
              )));
              const channelLabel = fieldBound && subjectBound
                ? "字段绑定 + 主题共享"
                : fieldBound
                  ? "字段绑定"
                  : subjectBound
                    ? "主题共享"
                    : "关联来源";
              const quotePreview = visibleCitationQuote(citation.quote);
              return <AppLink key={citation.id} data-citation-status={citation.status} data-quote-truncated={quotePreview.truncated ? "true" : "false"} href={`/knowledge${buildKnowledgeSearch({
                documentId: citation.documentId,
                sectionId: citation.locator.sectionId,
                lineNumber: citation.locator.startLine,
                citationId: citation.id,
                target: citationTarget
              })}`}>
                <span className="structured-citation-identity">
                  <code title={citation.documentId}>文档 {shortEvidenceBinding(citation.documentId)}</code>
                  <code title={citation.locator.sectionId}>章节 {shortEvidenceBinding(citation.locator.sectionId)}</code>
                  <time dateTime={citation.updatedAt}>更新 {citation.updatedAt.slice(0, 10)} UTC</time>
                </span>
                <blockquote dir="auto">{quotePreview.text}</blockquote>
                {quotePreview.truncated ? <small className="structured-citation-truncation">侧栏摘录已限制为前 {maximumRenderedCitationQuoteCharacters} 个字符；打开该引用核对完整记录。</small> : null}
                <small>{channelLabel} · {citationStatusLabels[citation.status]} · 第 {citation.locator.startLine}{citation.locator.endLine === citation.locator.startLine ? "" : `–${citation.locator.endLine}`} 行</small>
              </AppLink>;
            })}
          </div> : null}
          {omittedRenderedCitationCount > 0 ? <p className="evidence-citation-omission" role="note">本次共返回 {visibleCitations.length} 条引用；侧栏按更新时间仅渲染前 {maximumRenderedCitations} 条，另有 {omittedRenderedCitationCount} 条未在此处展开。显示预算不表示其不存在、已拒绝或已完成复核，请进入知识库按当前字段继续核对。</p> : null}
          {legacySourceRefs.length ? <div className="legacy-source-refs"><small>旧字符串来源 · 仅作迁移线索 · 显示 {legacySourceRefs.length}/{allLegacySourceRefs.length} 条去重记录</small><ul>{legacySourceRefs.map((source) => <li key={source} dir="auto">{source}</li>)}</ul>{omittedLegacySourceRefCount > 0 ? <p>另有 {omittedLegacySourceRefCount} 条安全去重记录未在侧栏展开；显示上限不表示这些记录不存在或已经完成核验。</p> : null}</div> : null}
          {citationIndexComplete && verifiedCitationCount === 0 ? <div className="source-missing"><CircleHelp aria-hidden="true" /><p><strong>{candidateCitationCount ? "只有候选引用" : rejectedCitationCount ? "引用均已拒绝" : provenanceConflict ? "来源记录冲突" : provenance ? "来源待核验" : "待补证据"}</strong> {candidateCitationCount ? `当前 ${candidateCitationCount} 条结构化引用仍是用户候选，尚未完成引用记录复核。` : rejectedCitationCount ? `当前 ${rejectedCitationCount} 条结构化引用均已拒绝，不能作为本字段依据。` : provenanceConflict ? "同字段 provenance 不唯一，不能据此显示字段金标；结构化引用仍按独立通道核对。" : provenance ? "目前仅记录上游实现与规则参数，尚未绑定完成引用复核的书名、版本和章节。" : "当前字段暂无直接来源，不展示或借用干支字段的来源。"}</p></div> : null}
          {visibleCitationErrors.length ? <div className="citation-load-error" role="alert"><div className="citation-load-error__messages">{visibleCitationErrors.map((item) => <p key={item.key}><strong>{item.label}：</strong>{item.message}</p>)}<small>{visibleCitationMergeError ? "同 ID 快照冲突时不会展示任一版本；请重新读取两侧来源。" : "成功通道仍可浏览；索引不完整期间不会据此判断当前字段没有来源。"}</small></div><button type="button" className="text-button" onClick={retryCitations}><RefreshCw aria-hidden="true" />重新读取两侧来源</button></div> : null}
          <AppLink className="secondary-action evidence-add-citation" href={knowledgeChartFieldHref(citationTarget)}><Link2 aria-hidden="true" />去知识库添加来源</AppLink>
          {evidenceSubjectId ? <AppLink className="secondary-action evidence-add-citation" href={knowledgeEvidenceSubjectHref(evidenceSubjectId, {
            caseId: revision.caseId,
            revisionId: revision.id,
            evidenceSubjectId,
            fieldPath: requestedProvenanceField
          })}><BookOpen aria-hidden="true" />建立两遍只读复核上下文（绑定当前 Revision 字段；不代表真值或最新）</AppLink> : null}
          {evidenceSubjectId ? <AppLink className="secondary-action evidence-add-citation" href={knowledgeEvidenceSubjectHref(evidenceSubjectId)}><BookOpen aria-hidden="true" />审阅通用主题来源（主题级，不绑定当前案例）</AppLink> : null}
        </section>
      </div>
    </aside>
  );
}
