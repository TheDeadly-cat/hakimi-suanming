import {
  citationRecordSchema,
  evidenceSubjectIdSchema,
  knowledgeDocumentRecordSchema,
  sourceRightsRecordSchema,
  type CitationRecord,
  type ChartFacts,
  type KnowledgeDocumentRecord,
  type KnowledgeSection,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";

export const MAX_KNOWLEDGE_DOCUMENT_BYTES = 2 * 1024 * 1024;
export const MAX_KNOWLEDGE_CONTENT_CHARACTERS = 2_000_000;
export const MAX_KNOWLEDGE_SECTIONS = 5_000;
export const MAX_CITATION_LINES = 200;
export const MAX_CITATION_QUOTE_CHARACTERS = 20_000;

export type KnowledgeCoreErrorCode =
  | "EMPTY_DOCUMENT"
  | "DOCUMENT_TOO_LARGE"
  | "DOCUMENT_CONTAINS_NUL"
  | "TOO_MANY_SECTIONS"
  | "INVALID_CITATION_RANGE"
  | "CITATION_TOO_LARGE"
  | "UNKNOWN_EVIDENCE_SUBJECT";

export class KnowledgeCoreError extends Error {
  readonly code: KnowledgeCoreErrorCode;

  constructor(code: KnowledgeCoreErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "KnowledgeCoreError";
  }
}

export type KnowledgeIntegrityMismatch =
  | "contentHash"
  | "lineCount"
  | "sections"
  | "documentId"
  | "documentContentHash"
  | "section"
  | "quote";

export class KnowledgeIntegrityError extends Error {
  readonly mismatch: KnowledgeIntegrityMismatch;

  constructor(mismatch: KnowledgeIntegrityMismatch, message: string) {
    super(message);
    this.mismatch = mismatch;
    this.name = "KnowledgeIntegrityError";
  }
}

export type KnowledgeSearchHit = {
  document: KnowledgeDocumentRecord;
  sectionId: string;
  lineNumber: number;
  excerpt: string;
};

export function inferKnowledgeFormat(fileName: string, mediaType = ""): KnowledgeDocumentRecord["format"] {
  const normalizedName = fileName.toLocaleLowerCase("en-US");
  const normalizedType = mediaType.toLocaleLowerCase("en-US").split(";", 1)[0]?.trim();
  return normalizedName.endsWith(".md") || normalizedName.endsWith(".markdown") || normalizedType === "text/markdown"
    ? "markdown"
    : "text";
}

export function normalizeKnowledgeContent(rawContent: string): string {
  const content = rawContent.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (content.includes("\0")) {
    throw new KnowledgeCoreError("DOCUMENT_CONTAINS_NUL", "资料包含 NUL 控制字符，不能作为 Markdown/TXT 导入。");
  }
  if (!content.trim()) {
    throw new KnowledgeCoreError("EMPTY_DOCUMENT", "资料内容为空。");
  }
  if (content.length > MAX_KNOWLEDGE_CONTENT_CHARACTERS) {
    throw new KnowledgeCoreError(
      "DOCUMENT_TOO_LARGE",
      `资料规范化后超过 ${MAX_KNOWLEDGE_CONTENT_CHARACTERS.toLocaleString("zh-CN")} 个字符上限。`
    );
  }
  return content;
}

function markdownHeading(line: string): { level: number; title: string } | null {
  const match = /^(#{1,6})[\t ]+(.+?)[\t ]*#*[\t ]*$/.exec(line);
  if (!match) return null;
  const title = match[2]?.trim() ?? "";
  return title ? { level: match[1]!.length, title } : null;
}

function markdownHeadingLines(lines: string[]): Array<{ line: number; level: number; title: string }> {
  const headings: Array<{ line: number; level: number; title: string }> = [];
  let fence: "`" | "~" | null = null;
  let fenceLength = 0;

  lines.forEach((line, index) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      const kind = marker[0] as "`" | "~";
      if (fence === null) {
        fence = kind;
        fenceLength = marker.length;
      } else if (fence === kind && marker.length >= fenceLength) {
        fence = null;
        fenceLength = 0;
      }
      return;
    }
    if (fence !== null) return;
    const heading = markdownHeading(line);
    if (heading) headings.push({ line: index + 1, ...heading });
  });
  return headings;
}

export function buildKnowledgeSections(
  content: string,
  format: KnowledgeDocumentRecord["format"]
): KnowledgeSection[] {
  const lines = content.split("\n");
  const lineCount = lines.length;
  const headings = format === "markdown" ? markdownHeadingLines(lines) : [];
  if (headings.length + 1 > MAX_KNOWLEDGE_SECTIONS) {
    throw new KnowledgeCoreError("TOO_MANY_SECTIONS", `资料章节数超过 ${MAX_KNOWLEDGE_SECTIONS.toLocaleString("zh-CN")} 个上限。`);
  }
  if (!headings.length) {
    return [{ id: "section-1", title: "全文", level: 0, startLine: 1, endLine: lineCount }];
  }

  const starts: Array<{ line: number; level: number; title: string }> = [];
  if (headings[0]!.line > 1) starts.push({ line: 1, level: 0, title: "开篇" });
  starts.push(...headings);
  return starts.map((start, index) => ({
    id: `section-${start.line}`,
    title: start.title,
    level: start.level,
    startLine: start.line,
    endLine: (starts[index + 1]?.line ?? lineCount + 1) - 1
  }));
}

export async function buildKnowledgeContentSnapshot(
  rawContent: string,
  format: KnowledgeDocumentRecord["format"]
): Promise<Pick<KnowledgeDocumentRecord, "content" | "contentHash" | "lineCount" | "sections">> {
  const content = normalizeKnowledgeContent(rawContent);
  return {
    content,
    contentHash: await sha256Hex(content),
    lineCount: content.split("\n").length,
    sections: buildKnowledgeSections(content, format)
  };
}

export function sectionForKnowledgeLine(knowledgeDocument: KnowledgeDocumentRecord, lineNumber: number): KnowledgeSection {
  const section = knowledgeDocument.sections.find((candidate) =>
    candidate.startLine <= lineNumber && candidate.endLine >= lineNumber
  );
  if (!section) {
    throw new KnowledgeCoreError("INVALID_CITATION_RANGE", `第 ${lineNumber} 行不属于资料的任何章节。`);
  }
  return section;
}

export function extractKnowledgeQuote(content: string, startLine: number, endLine: number): string {
  const lines = content.split("\n");
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 1 ||
    endLine < startLine ||
    endLine > lines.length
  ) {
    throw new KnowledgeCoreError("INVALID_CITATION_RANGE", `引用行号必须位于 1–${lines.length} 行之间。`);
  }
  if (endLine - startLine + 1 > MAX_CITATION_LINES) {
    throw new KnowledgeCoreError("CITATION_TOO_LARGE", `单条引用不能超过 ${MAX_CITATION_LINES} 行。`);
  }
  const quote = lines.slice(startLine - 1, endLine).join("\n");
  if (!quote.trim()) throw new KnowledgeCoreError("INVALID_CITATION_RANGE", "不能引用只有空白的行范围。");
  if (quote.length > MAX_CITATION_QUOTE_CHARACTERS) {
    throw new KnowledgeCoreError("CITATION_TOO_LARGE", `单条引用不能超过 ${MAX_CITATION_QUOTE_CHARACTERS.toLocaleString("zh-CN")} 个字符。`);
  }
  return quote;
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("zh-CN");
}

function excerptAtLine(content: string, lineNumber: number, terms: string[]): string {
  const lines = content.split("\n");
  const center = Math.max(0, lineNumber - 1);
  const raw = lines.slice(Math.max(0, center - 1), Math.min(lines.length, center + 2)).join(" ").trim();
  if (raw.length <= 180) return raw;
  const normalized = normalizeSearchText(raw);
  const first = terms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, first - 60);
  const end = Math.min(raw.length, start + 180);
  return `${start > 0 ? "…" : ""}${raw.slice(start, end)}${end < raw.length ? "…" : ""}`;
}

export function searchKnowledgeDocuments(
  documents: KnowledgeDocumentRecord[],
  rawQuery: string,
  options: { limit?: number } = {}
): KnowledgeSearchHit[] {
  const terms = normalizeSearchText(rawQuery).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
  const hits: KnowledgeSearchHit[] = [];

  for (const rawDocument of documents) {
    const knowledgeDocument = knowledgeDocumentRecordSchema.parse(rawDocument);
    const metadata = normalizeSearchText([
      knowledgeDocument.title,
      knowledgeDocument.author,
      knowledgeDocument.edition,
      knowledgeDocument.sourceNote,
      knowledgeDocument.fileName
    ].join(" "));
    const normalizedContent = normalizeSearchText(knowledgeDocument.content);
    if (!terms.every((term) => metadata.includes(term) || normalizedContent.includes(term))) continue;
    const contentIndexes = terms.map((term) => normalizedContent.indexOf(term)).filter((index) => index >= 0);
    const firstIndex = contentIndexes.length ? Math.min(...contentIndexes) : 0;
    const lineNumber = normalizedContent.slice(0, firstIndex).split("\n").length;
    const section = sectionForKnowledgeLine(knowledgeDocument, lineNumber);
    hits.push({
      document: knowledgeDocument,
      sectionId: section.id,
      lineNumber,
      excerpt: excerptAtLine(knowledgeDocument.content, lineNumber, terms)
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

export async function verifyKnowledgeDocumentIntegrity(
  input: KnowledgeDocumentRecord
): Promise<KnowledgeDocumentRecord> {
  const knowledgeDocument = knowledgeDocumentRecordSchema.parse(input);
  const snapshot = await buildKnowledgeContentSnapshot(knowledgeDocument.content, knowledgeDocument.format);
  if (snapshot.contentHash !== knowledgeDocument.contentHash) {
    throw new KnowledgeIntegrityError("contentHash", `资料 ${knowledgeDocument.id} 的内容摘要不匹配。`);
  }
  if (snapshot.lineCount !== knowledgeDocument.lineCount) {
    throw new KnowledgeIntegrityError("lineCount", `资料 ${knowledgeDocument.id} 的行数快照不匹配。`);
  }
  if (canonicalStringify(snapshot.sections) !== canonicalStringify(knowledgeDocument.sections)) {
    throw new KnowledgeIntegrityError("sections", `资料 ${knowledgeDocument.id} 的章节快照不匹配。`);
  }
  return knowledgeDocument;
}

export async function verifyCitationIntegrity(
  input: CitationRecord,
  documentInput: KnowledgeDocumentRecord
): Promise<CitationRecord> {
  const citation = citationRecordSchema.parse(input);
  const knowledgeDocument = await verifyKnowledgeDocumentIntegrity(documentInput);
  if (citation.documentId !== knowledgeDocument.id) {
    throw new KnowledgeIntegrityError("documentId", `引用 ${citation.id} 绑定了错误的资料。`);
  }
  if (citation.documentContentHash !== knowledgeDocument.contentHash) {
    throw new KnowledgeIntegrityError("documentContentHash", `引用 ${citation.id} 的资料摘要已失配。`);
  }
  const section = knowledgeDocument.sections.find((candidate) => candidate.id === citation.locator.sectionId);
  if (
    !section ||
    citation.locator.startLine < section.startLine ||
    citation.locator.endLine > section.endLine
  ) {
    throw new KnowledgeIntegrityError("section", `引用 ${citation.id} 的章节或行号无效。`);
  }
  const quote = extractKnowledgeQuote(knowledgeDocument.content, citation.locator.startLine, citation.locator.endLine);
  if (quote !== citation.quote) {
    throw new KnowledgeIntegrityError("quote", `引用 ${citation.id} 的原文摘录不匹配。`);
  }
  return citation;
}

export const EVIDENCE_SUBJECT_REGISTRY_VERSION = "1.0.0" as const;

export type EvidenceSubject = {
  subjectId: string;
  registryVersion: typeof EVIDENCE_SUBJECT_REGISTRY_VERSION;
  status: "active" | "retired";
  category: "calendar_fact" | "rule_derived";
  label: string;
  requiredForV1: boolean;
  algorithmIds: string[];
  fieldPaths: string[];
  ruleProfilePaths: string[];
};

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
const PILLAR_LABELS = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;
const FIELD_DEFINITIONS = [
  { key: "ganZhi", id: "ganzhi", label: "干支", algorithm: "pillar" },
  { key: "hiddenStems", id: "hidden-stems", label: "藏干", algorithm: "lunar-typescript:1.8.6:LunarUtil.ZHI_HIDE_GAN" },
  { key: "stemTenGod", id: "stem-ten-god", label: "天干十神", algorithm: "lunar-typescript:1.8.6:LunarUtil.SHI_SHEN:final-day-stem" },
  { key: "branchTenGods", id: "branch-ten-gods", label: "地支十神", algorithm: "lunar-typescript:1.8.6:LunarUtil.SHI_SHEN:final-day-stem" },
  { key: "wuXing", id: "five-elements", label: "五行", algorithm: "lunar-typescript:1.8.6:LunarUtil.WU_XING_GAN+WU_XING_ZHI" },
  { key: "nayin", id: "nayin", label: "纳音", algorithm: "lunar-typescript:1.8.6:LunarUtil.NAYIN" },
  { key: "twelveGrowth", id: "twelve-growth", label: "十二长生", algorithm: "lunar-typescript:1.8.6:LunarUtil.CHANG_SHENG_OFFSET:final-day-stem" },
  { key: "xun", id: "xun", label: "旬", algorithm: "lunar-typescript:1.8.6:LunarUtil.getXun" },
  { key: "voidBranches", id: "void-branches", label: "旬空", algorithm: "lunar-typescript:1.8.6:LunarUtil.getXunKong" }
] as const;

function pillarAlgorithmIds(pillar: typeof PILLAR_KEYS[number]): string[] {
  const prefix = "hakimi-bazi-core:fixed-plus08-year-month-local-civil-day-hour";
  if (pillar === "year" || pillar === "month") return [`${prefix}:fixed-plus08:${pillar}-exact:v1`];
  if (pillar === "day") return [
    `${prefix}:local-civil:day:midnight:v1`,
    `${prefix}:local-civil:day:zi_start_23:v1`
  ];
  return [
    `${prefix}:local-civil:hour:time-gan-from-final-day:midnight:v1`,
    `${prefix}:local-civil:hour:time-gan-from-final-day:zi_start_23:v1`
  ];
}

export const EVIDENCE_SUBJECTS: readonly EvidenceSubject[] = Object.freeze(
  PILLAR_KEYS.flatMap((pillar) => FIELD_DEFINITIONS.map((field) => Object.freeze({
    subjectId: `bazi.pillar.${pillar}.${field.id}.v1`,
    registryVersion: EVIDENCE_SUBJECT_REGISTRY_VERSION,
    status: "active" as const,
    category: "rule_derived" as const,
    label: `${PILLAR_LABELS[pillar]} · ${field.label}`,
    requiredForV1: true,
    algorithmIds: field.algorithm === "pillar" ? pillarAlgorithmIds(pillar) : [field.algorithm],
    fieldPaths: [`pillars.${pillar}.${field.key}`],
    ruleProfilePaths: pillar === "day" || pillar === "hour" ? ["calendar.dayBoundary"] : []
  })))
);

const EVIDENCE_SUBJECT_BY_ID = new Map(EVIDENCE_SUBJECTS.map((subject) => [subject.subjectId, subject]));
const EVIDENCE_SUBJECT_BY_FIELD = new Map(EVIDENCE_SUBJECTS.flatMap((subject) =>
  subject.fieldPaths.map((fieldPath) => [fieldPath, subject] as const)
));

if (EVIDENCE_SUBJECT_BY_ID.size !== EVIDENCE_SUBJECTS.length || EVIDENCE_SUBJECT_BY_FIELD.size !== 36) {
  throw new Error("证据主题注册表包含重复 ID 或字段映射。");
}

export function evidenceSubjectIdForField(fieldPath: string): string | null {
  return EVIDENCE_SUBJECT_BY_FIELD.get(fieldPath)?.subjectId ?? null;
}

export function requireEvidenceSubject(subjectId: string): EvidenceSubject {
  evidenceSubjectIdSchema.parse(subjectId);
  const subject = EVIDENCE_SUBJECT_BY_ID.get(subjectId);
  if (!subject) throw new KnowledgeCoreError("UNKNOWN_EVIDENCE_SUBJECT", `未知证据主题：${subjectId}`);
  return subject;
}

export type EvidenceCoverageMetric = {
  numerator: number;
  denominator: number;
  rate: number | null;
};

export type EvidenceCoverageGap =
  | "missing_provenance"
  | "unregistered_algorithm"
  | "duplicate_provenance"
  | "legacy_source_refs_only"
  | "no_structured_citation"
  | "only_candidate_citations"
  | "no_redistributable_verified_source";

export type EvidenceCoverageRow = {
  subject: EvidenceSubject;
  provenance: ChartFacts["fieldProvenance"][number] | null;
  provenanceCount: number;
  legacySourceRefs: string[];
  candidateCitationIds: string[];
  verifiedCitationIds: string[];
  redistributableCitationIds: string[];
  gaps: EvidenceCoverageGap[];
};

export type EvidenceCoverageReport = {
  registryVersion: typeof EVIDENCE_SUBJECT_REGISTRY_VERSION;
  scope: "required_v1_subjects";
  metrics: {
    provenanceCompleteness: EvidenceCoverageMetric;
    structuredLink: EvidenceCoverageMetric;
    doubleReviewed: EvidenceCoverageMetric;
    redistributableSource: EvidenceCoverageMetric;
  };
  provenanceStatusCounts: Record<ChartFacts["fieldProvenance"][number]["verificationStatus"], number>;
  goldVerifiedCount: number;
  legacySourceRefCount: number;
  rows: EvidenceCoverageRow[];
  unregistered: Array<{ field: string; algorithmId: string }>;
  digest: string;
};

function metric(numerator: number, denominator: number): EvidenceCoverageMetric {
  return { numerator, denominator, rate: denominator === 0 ? null : numerator / denominator };
}

export function isRedistributableSourceRights(record: SourceRightsRecord): boolean {
  const rights = sourceRightsRecordSchema.parse(record);
  const workClear = rights.rights.workStatus === "public_domain_verified"
    || rights.rights.workStatus === "project_original_verified";
  const editionClear = rights.rights.editionStatus === "public_domain_verified"
    || rights.rights.editionStatus === "licensed_verified"
    || rights.rights.editionStatus === "project_original_verified";
  return rights.origin === "bundled"
    && rights.rights.distributionPolicy === "redistributable"
    && rights.review.status === "double_reviewed"
    && workClear
    && editionClear
    && rights.rights.status !== "user_unverified"
    && rights.rights.status !== "blocked";
}

export async function buildEvidenceCoverageReport(input: {
  provenance: ChartFacts["fieldProvenance"];
  citations: CitationRecord[];
  sourceRights: SourceRightsRecord[];
  subjects?: readonly EvidenceSubject[];
}): Promise<EvidenceCoverageReport> {
  const subjects = [...(input.subjects ?? EVIDENCE_SUBJECTS)]
    .filter((subject) => subject.status === "active" && subject.requiredForV1)
    .sort((left, right) => left.subjectId.localeCompare(right.subjectId, "en"));
  const provenance = input.provenance.map((item) => ({ ...item, sourceRefs: [...item.sourceRefs] }));
  const citations = input.citations.map((item) => citationRecordSchema.parse(item));
  const rights = input.sourceRights.map((item) => sourceRightsRecordSchema.parse(item));
  const rightsByDocument = new Map(rights.map((item) => [item.documentId, item]));
  const knownFields = new Set(subjects.flatMap((subject) => subject.fieldPaths));
  const unregistered = provenance
    .filter((item) => !knownFields.has(item.field))
    .map((item) => ({ field: item.field, algorithmId: item.algorithmId }))
    .sort((left, right) => left.field.localeCompare(right.field, "en") || left.algorithmId.localeCompare(right.algorithmId, "en"));

  const rows: EvidenceCoverageRow[] = subjects.map((subject) => {
    const matchingProvenance = provenance.filter((item) => subject.fieldPaths.includes(item.field));
    const first = matchingProvenance[0] ?? null;
    const algorithmRegistered = Boolean(first && subject.algorithmIds.includes(first.algorithmId));
    const subjectCitations = citations.filter((citation) => citation.status !== "rejected" && citation.targets.some((target) =>
      target.kind === "evidence_subject" && target.subjectId === subject.subjectId
    ));
    const verifiedCitations = subjectCitations.filter((citation) => citation.status === "verified");
    const redistributableCitations = verifiedCitations.filter((citation) => {
      const sourceRights = rightsByDocument.get(citation.documentId);
      return Boolean(sourceRights
        && sourceRights.documentContentHash === citation.documentContentHash
        && isRedistributableSourceRights(sourceRights));
    });
    const legacySourceRefs = [...new Set(matchingProvenance.flatMap((item) => item.sourceRefs))].sort();
    const gaps: EvidenceCoverageGap[] = [];
    if (!first) gaps.push("missing_provenance");
    else if (!algorithmRegistered) gaps.push("unregistered_algorithm");
    if (matchingProvenance.length > 1) gaps.push("duplicate_provenance");
    if (!subjectCitations.length) {
      if (legacySourceRefs.length) gaps.push("legacy_source_refs_only");
      gaps.push("no_structured_citation");
    } else if (!verifiedCitations.length) {
      gaps.push("only_candidate_citations");
    }
    if (!redistributableCitations.length) gaps.push("no_redistributable_verified_source");
    return {
      subject,
      provenance: first,
      provenanceCount: matchingProvenance.length,
      legacySourceRefs,
      candidateCitationIds: subjectCitations.filter((citation) => citation.status === "user_candidate").map((citation) => citation.id).sort(),
      verifiedCitationIds: verifiedCitations.map((citation) => citation.id).sort(),
      redistributableCitationIds: redistributableCitations.map((citation) => citation.id).sort(),
      gaps
    };
  });

  const denominator = rows.length;
  const provenanceStatusCounts: EvidenceCoverageReport["provenanceStatusCounts"] = {
    gold_verified: 0,
    adjudicated: 0,
    disputed: 0,
    experimental: 0
  };
  rows.forEach((row) => {
    if (row.provenance) provenanceStatusCounts[row.provenance.verificationStatus] += 1;
  });
  const reportWithoutDigest = {
    registryVersion: EVIDENCE_SUBJECT_REGISTRY_VERSION,
    scope: "required_v1_subjects" as const,
    metrics: {
      provenanceCompleteness: metric(rows.filter((row) => row.provenance && !row.gaps.includes("unregistered_algorithm")).length, denominator),
      structuredLink: metric(rows.filter((row) => row.candidateCitationIds.length + row.verifiedCitationIds.length > 0).length, denominator),
      doubleReviewed: metric(rows.filter((row) => row.verifiedCitationIds.length > 0).length, denominator),
      redistributableSource: metric(rows.filter((row) => row.redistributableCitationIds.length > 0).length, denominator)
    },
    provenanceStatusCounts,
    goldVerifiedCount: provenanceStatusCounts.gold_verified,
    legacySourceRefCount: rows.filter((row) => row.legacySourceRefs.length > 0).length,
    rows,
    unregistered
  };
  return { ...reportWithoutDigest, digest: await sha256Hex(reportWithoutDigest) };
}

export type BundledKnowledgeReleaseEntry = {
  path: string;
  documentId: string;
  contentHash: string;
  sourceRights: SourceRightsRecord;
};

export function validateBundledKnowledgeRelease(entries: readonly BundledKnowledgeReleaseEntry[]): BundledKnowledgeReleaseEntry[] {
  const seenPaths = new Set<string>();
  const seenDocuments = new Set<string>();
  return [...entries].sort((left, right) => left.path.localeCompare(right.path, "en")).map((entry) => {
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/.test(entry.path)
      || entry.path.includes("..") || entry.path.startsWith("/") || entry.path.includes("\\")) {
      throw new Error(`随包资料路径不安全：${entry.path}`);
    }
    if (seenPaths.has(entry.path) || seenDocuments.has(entry.documentId)) {
      throw new Error(`随包资料 manifest 包含重复路径或 documentId：${entry.path}`);
    }
    seenPaths.add(entry.path);
    seenDocuments.add(entry.documentId);
    const rights = sourceRightsRecordSchema.parse(entry.sourceRights);
    if (rights.documentId !== entry.documentId || rights.documentContentHash !== entry.contentHash) {
      throw new Error(`随包资料 ${entry.path} 的正文哈希或 documentId 与权利台账不匹配。`);
    }
    if (!isRedistributableSourceRights(rights)) {
      throw new Error(`随包资料 ${entry.path} 尚未通过作品层、现代版本层及双人分发审核。`);
    }
    return { ...entry, sourceRights: rights };
  });
}
