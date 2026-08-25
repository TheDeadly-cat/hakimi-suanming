import { AlertTriangle, FileDown, FileUp, RotateCcw, X } from "lucide-react";
import { startTransition, useEffect, useId, useMemo, useRef, useState } from "react";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  CaseImportCancelledError,
  MAX_CASE_IMPORT_RECORD_CHARACTERS,
  MAX_CASE_IMPORT_ROWS,
  type CaseImportCandidate,
  type CaseImportColumnMapping,
  type CaseImportField,
  type CaseImportPlan,
  type CaseImportProgress,
  type CaseImportRow,
  type CsvSourceProgress,
  type DuplicatePolicy
} from "@hakimi/case-import";
import { pickFile, webReportExportPort, type PickedFile } from "@hakimi/platform";
import { caseRepository, DuplicateBirthFingerprintError } from "@hakimi/storage";
import { APP_VERSION } from "../lib/app-version";
import { loadActiveRulePackContext } from "../lib/active-rule-pack";
import { safeVisibleErrorMessage as getErrorMessage, safeVisibleText } from "../lib/visible-text";
import {
  buildCaseImportPlanOffMainThread,
  readCaseImportHeadersOffMainThread
} from "../lib/case-import-worker-client";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import "./csv-case-importer.css";

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const MAX_CSV_COLUMNS = 256;
const MAX_CSV_HEADER_CHARACTERS = 512;
const ROW_PREVIEW_LIMIT = 200;
const MAX_IMPORT_REPORT_CHARACTERS = 32 * 1024 * 1024;
const MAX_IMPORT_REPORT_BYTES = 32 * 1024 * 1024;
const UNSAFE_CSV_FILENAME_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const WINDOWS_RESERVED_CSV_FILENAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;

const CASE_IMPORT_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
  "data-mutation-epoch-bypassed": "false",
} as const;

const TEMPLATE_MAPPING: CaseImportColumnMapping = {
  alias: "案例名",
  calendarType: "历法",
  date: "出生日期",
  time: "出生时间",
  timePrecision: "时间精度",
  timeZone: "IANA时区",
  sex: "性别",
  lunarLeapMonth: "闰月",
  locationLabel: "地点",
  latitude: "纬度",
  longitude: "经度",
  locationPrecision: "地点精度",
  tags: "标签",
  sourceNote: "来源备注"
};

type MappingState = Partial<Record<CaseImportField, number>>;
type MappingConflict = { columnIndex: number; fields: string[] };

const MAPPING_FIELDS = [
  { key: "alias", label: "案例别名", required: true },
  { key: "date", label: "出生日期", required: true },
  { key: "timePrecision", label: "时间精度", required: true },
  { key: "timeZone", label: "IANA 时区", required: true },
  { key: "sex", label: "性别", required: true },
  { key: "calendarType", label: "历法（未映射默认公历）", required: false },
  { key: "time", label: "出生时间", required: false },
  { key: "lunarLeapMonth", label: "闰月", required: false },
  { key: "locationLabel", label: "地点", required: false },
  { key: "latitude", label: "纬度", required: false },
  { key: "longitude", label: "经度", required: false },
  { key: "locationPrecision", label: "地点精度", required: false },
  { key: "tags", label: "标签", required: false },
  { key: "sourceNote", label: "来源备注", required: false }
] as const satisfies ReadonlyArray<{ key: CaseImportField; label: string; required: boolean }>;

const REQUIRED_MAPPING_FIELDS = new Set<CaseImportField>(MAPPING_FIELDS.filter((field) => field.required).map((field) => field.key));
const REQUIRED_MAPPING_DEFINITIONS = MAPPING_FIELDS.filter((field) => field.required);
const OPTIONAL_MAPPING_DEFINITIONS = MAPPING_FIELDS.filter((field) => !field.required);

const TEMPLATE_HEADERS = [
  "案例名",
  "历法",
  "出生日期",
  "出生时间",
  "时间精度",
  "IANA时区",
  "性别",
  "闰月",
  "地点",
  "纬度",
  "经度",
  "地点精度",
  "标签",
  "来源备注"
] as const;

const TEMPLATE_EXAMPLE = [
  "研究案例 A-001",
  "公历",
  "1995-08-18",
  "14:30",
  "精确到分钟",
  "Asia/Shanghai",
  "男",
  "否",
  "上海",
  "31.2304",
  "121.4737",
  "坐标",
  "教学|待复核",
  "本人提供"
] as const;

type ImportPhase = "idle" | "reading" | "mapping" | "preflighting" | "ready" | "importing";
type MainOperation = "choose_file" | "preflight" | "import";
type FileDeliveryOperation = "template" | "report";

type WriteResult = {
  rowNumber: number;
  alias: string;
  status: "imported" | "failed" | "skipped_duplicate" | "commit_unknown";
  message: string;
};

type ImportWriteReconciliationIssue = {
  rowNumber: number;
  detail: string;
};

type WriteProgress = {
  total: number;
  processed: number;
  imported: number;
  failed: number;
  skipped: number;
};

export type CsvCaseImporterProps = {
  onImported?: () => void | Promise<void>;
  acquireMutation?: () => boolean;
  releaseMutation?: () => void;
};

function csvCell(rawValue: string): string {
  const value = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvLine(values: readonly string[]): string {
  return values.map(csvCell).join(",");
}

function safeImportText(value: unknown, fallback: string, maxLength = 600): string {
  return safeVisibleText(value, fallback || "CSV 操作未完成。", maxLength);
}

function sourceProgressUnitLabel(unit: CsvSourceProgress["unit"]): "字节" | "字符" {
  return unit === "utf8_bytes" ? "字节" : "字符";
}

function inferMapping(headers: readonly string[]): MappingState {
  const mapping: MappingState = {};
  for (const field of MAPPING_FIELDS) {
    const templateSelector = TEMPLATE_MAPPING[field.key];
    const candidates = [typeof templateSelector === "string" ? templateSelector : "", field.key, field.label.replace(/（.*$/, "")];
    const matchedIndex = headers.findIndex((header) => candidates.includes(header));
    if (matchedIndex >= 0) mapping[field.key] = matchedIndex;
  }
  return mapping;
}

function hasRequiredMapping(mapping: MappingState): boolean {
  return [...REQUIRED_MAPPING_FIELDS].every((field) => mapping[field] !== undefined);
}

function findMappingConflicts(mapping: MappingState): MappingConflict[] {
  const assignments = new Map<number, string[]>();
  for (const field of MAPPING_FIELDS) {
    const columnIndex = mapping[field.key];
    if (columnIndex === undefined) continue;
    const fields = assignments.get(columnIndex) ?? [];
    fields.push(field.label.replace(/（.*$/, ""));
    assignments.set(columnIndex, fields);
  }
  return [...assignments.entries()]
    .filter(([, fields]) => fields.length > 1)
    .map(([columnIndex, fields]) => ({ columnIndex, fields }));
}

function toColumnMapping(mapping: MappingState): CaseImportColumnMapping {
  if (!hasRequiredMapping(mapping)) throw new Error("请先映射全部必填字段。");
  const conflicts = findMappingConflicts(mapping);
  if (conflicts.length) {
    throw new Error("同一 CSV 列不能同时映射到多个研究字段，请先解决映射冲突。");
  }
  const result: Partial<Record<CaseImportField, number>> = {};
  for (const field of MAPPING_FIELDS) {
    const selector = mapping[field.key];
    if (selector !== undefined) result[field.key] = selector;
  }
  return result as CaseImportColumnMapping;
}

function isCancellation(reason: unknown): boolean {
  return reason instanceof CaseImportCancelledError
    || (typeof reason === "object" && reason !== null && "code" in reason && reason.code === "IMPORT_CANCELLED");
}

function rowAlias(row: CaseImportRow): string {
  if (row.status === "ready") return safeImportText(row.candidate.alias, "", 240);
  if (row.status === "invalid" && row.candidate) return safeImportText(row.candidate.alias, "", 240);
  return "";
}

function rowPrecision(row: CaseImportRow): string {
  if (row.status === "ready") return row.candidate.input.timePrecision;
  if (row.status === "invalid" && row.candidate) return row.candidate.input.timePrecision;
  return "";
}

function preflightRowStatus(row: CaseImportRow): { label: string; detail: string } {
  if (row.status === "skipped_duplicate") {
    return {
      label: "已跳过重复",
      detail: row.duplicateSource === "existing_data" ? "与已有案例输入重复" : "与 CSV 中较早的记录重复"
    };
  }
  if (row.status === "invalid") {
    return {
      label: "格式错误",
      detail: safeImportText(
        row.errors
          .map((error) => `[${error.code}]${error.field ? ` ${error.field}:` : ""} ${safeImportText(error.message, "未提供错误详情。")}`)
          .join(" | "),
        "格式错误详情不可显示。",
        2_000
      )
    };
  }
  if (row.candidate.input.timePrecision === "unknown_hour") {
    return {
      label: "可写入候选组",
      detail: "保持原始 time=null，写入 13 个代表性探针及完整快照；不会选定或合成主盘。"
    };
  }
  return { label: "可尝试写入", detail: "写入前仍会执行真实排盘计算；计算失败会保留为逐行错误。" };
}

function sameImportCandidate(left: CaseImportCandidate, right: CaseImportCandidate): boolean {
  let sameInput = false;
  try {
    sameInput = JSON.stringify(left.input) === JSON.stringify(right.input);
  } catch {
    return false;
  }
  const sameDuplicate = left.duplicate === null || right.duplicate === null
    ? left.duplicate === right.duplicate
    : left.duplicate.source === right.duplicate.source
      && left.duplicate.policy === right.duplicate.policy;
  return left.rowNumber === right.rowNumber
    && left.recordNumber === right.recordNumber
    && left.alias === right.alias
    && left.sourceNote === right.sourceNote
    && left.fingerprint === right.fingerprint
    && left.tags.length === right.tags.length
    && left.tags.every((tag, index) => tag === right.tags[index])
    && sameDuplicate
    && sameInput;
}

function caseImportPlanIntegrityIssue(plan: CaseImportPlan, expectedHeaders: readonly string[]): string | null {
  const statValues = Object.values(plan.stats);
  if (statValues.some((value) => !Number.isInteger(value) || value < 0)) {
    return "后台计划包含无效统计计数。";
  }
  if (
    plan.stats.totalRows > MAX_CASE_IMPORT_ROWS
    || plan.stats.processedRows > MAX_CASE_IMPORT_ROWS
    || plan.rows.length > MAX_CASE_IMPORT_ROWS
    || plan.imports.length > MAX_CASE_IMPORT_ROWS
  ) {
    return `后台计划超过 ${MAX_CASE_IMPORT_ROWS} 行的页面复核上限。`;
  }
  if (plan.headers.length !== expectedHeaders.length || plan.headers.some((header, index) => header !== expectedHeaders[index])) {
    return "后台计划表头与当前文件表头不一致。";
  }
  if (plan.stats.importableRows !== plan.imports.length) {
    return "可导入统计与候选记录数量不一致。";
  }
  const invalidRows = plan.rows.filter((row) => row.status === "invalid").length;
  const skippedRows = plan.rows.filter((row) => row.status === "skipped_duplicate").length;
  const readyRows = plan.rows.filter((row) => row.status === "ready");
  if (plan.stats.invalidRows !== invalidRows || plan.stats.skippedRows !== skippedRows || readyRows.length !== plan.imports.length) {
    return "逐行状态与预检统计不一致。";
  }
  if (plan.hasRowErrors !== (invalidRows > 0) || plan.allowsPartialImport !== true) {
    return "计划错误标记或部分导入边界不一致。";
  }
  if (plan.stats.processedRows < plan.rows.length || plan.stats.totalRows < plan.stats.processedRows) {
    return "计划处理行数小于已返回的逐行账本。";
  }
  const rowNumbers = plan.rows.map((row) => row.rowNumber);
  const recordNumbers = plan.rows.map((row) => row.recordNumber);
  if (
    new Set(rowNumbers).size !== rowNumbers.length
    || new Set(recordNumbers).size !== recordNumbers.length
    || plan.rows.some((row) => !Number.isInteger(row.rowNumber) || row.rowNumber < 1 || !Number.isInteger(row.recordNumber) || row.recordNumber < 1)
  ) {
    return "逐行账本包含重复或无效行定位。";
  }
  if (readyRows.some((row) => row.rowNumber !== row.candidate.rowNumber || row.recordNumber !== row.candidate.recordNumber)) {
    return "可导入逐行账本与候选自身的行定位不一致。";
  }
  const readyByRow = new Map(readyRows.map((row) => [row.rowNumber, row.candidate]));
  const importRowNumbers = plan.imports.map((candidate) => candidate.rowNumber);
  if (new Set(importRowNumbers).size !== importRowNumbers.length) {
    return "可导入候选包含重复 CSV 行。";
  }
  for (const candidate of plan.imports) {
    const rowCandidate = readyByRow.get(candidate.rowNumber);
    if (
      !rowCandidate ||
      !candidate.fingerprint.trim() ||
      !sameImportCandidate(rowCandidate, candidate)
    ) {
      return `第 ${candidate.rowNumber} 行候选没有绑定同一逐行计划。`;
    }
  }
  return null;
}

function preparePickedCsvFile(pickedFile: PickedFile): PickedFile {
  if (!Number.isFinite(pickedFile.size) || pickedFile.size <= 0) {
    throw new Error("CSV 文件为空或大小信息无效。");
  }
  if (pickedFile.size > MAX_CSV_BYTES) {
    throw new Error(`CSV 文件超过 ${(MAX_CSV_BYTES / 1024 / 1024).toFixed(0)} MiB 上限。`);
  }
  if (pickedFile.blob.size !== pickedFile.size) {
    throw new Error("CSV 文件大小在选择与读取之间不一致，已停止导入以避免身份错配。");
  }
  const fileName = pickedFile.name.normalize("NFC");
  if (
    !fileName
    || fileName !== pickedFile.name
    || fileName !== fileName.trim()
    || /[\\/]/u.test(fileName)
    || UNSAFE_CSV_FILENAME_PATTERN.test(fileName)
  ) {
    throw new Error("CSV 文件名为空、包含路径/不可显示字符，或规范化后身份发生变化。");
  }
  if (Array.from(fileName).length > 255) throw new Error("CSV 文件名超过 255 个字符。");
  if (WINDOWS_RESERVED_CSV_FILENAME_PATTERN.test(fileName)) throw new Error("CSV 文件名使用了 Windows 保留设备名。");
  if (!fileName.toLocaleLowerCase("en-US").endsWith(".csv")) {
    throw new Error("仅支持扩展名为 .csv 的案例文件。");
  }
  return { ...pickedFile, name: fileName };
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MiB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KiB`;
  return `${size} B`;
}

function makeReport(plan: CaseImportPlan, writeResults: ReadonlyMap<number, WriteResult>): string {
  const header = ["CSV行", "记录号", "案例别名", "时间精度", "状态", "详情"];
  const lines = [csvLine(header)];
  let totalCharacters = 1 + lines[0]!.length;
  for (const row of plan.rows) {
    const preflight = preflightRowStatus(row);
    const writeResult = writeResults.get(row.rowNumber);
    const line = csvLine([
      String(row.rowNumber),
      String(row.recordNumber),
      rowAlias(row),
      rowPrecision(row),
      writeResult
        ? writeResult.status === "imported"
          ? "已导入"
          : writeResult.status === "skipped_duplicate"
            ? "提交时跳过重复"
            : writeResult.status === "commit_unknown"
              ? "写入结果未知"
              : "写入失败"
        : preflight.label,
      writeResult?.message ?? preflight.detail
    ]);
    totalCharacters += 2 + line.length;
    if (totalCharacters > MAX_IMPORT_REPORT_CHARACTERS) {
      throw new Error(`完整报告超过 ${MAX_IMPORT_REPORT_CHARACTERS} 个 UTF-16 代码单元的本地准备上限。`);
    }
    lines.push(line);
  }
  return `\ufeff${lines.join("\r\n")}`;
}

function prepareCsvDeliveryArtifact(content: string): Blob {
  if (content.length > MAX_IMPORT_REPORT_CHARACTERS) {
    throw new Error("CSV 交付内容超过本地字符预算。");
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  if (blob.size > MAX_IMPORT_REPORT_BYTES) {
    throw new Error(`CSV 交付内容为 ${blob.size} 字节，超过 ${MAX_IMPORT_REPORT_BYTES} 字节的本地准备上限。`);
  }
  return blob;
}

const caseImportNumberFormatter = new Intl.NumberFormat("zh-CN");

export function CsvCaseImporter({ onImported, acquireMutation, releaseMutation }: CsvCaseImporterProps) {
  const importerTitleId = useId();
  const mutationEpochReady = typeof acquireMutation === "function" && typeof releaseMutation === "function";
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingState>({});
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>("skip");
  const [plan, setPlan] = useState<CaseImportPlan | null>(null);
  const [sourceProgress, setSourceProgress] = useState<CsvSourceProgress | null>(null);
  const [preflightProgress, setPreflightProgress] = useState<CaseImportProgress | null>(null);
  const [writeProgress, setWriteProgress] = useState<WriteProgress | null>(null);
  const [writeResults, setWriteResults] = useState<Map<number, WriteResult>>(() => new Map());
  const [writeReconciliationIssue, setWriteReconciliationIssue] =
    useState<ImportWriteReconciliationIssue | null>(null);
  const [successfulRows, setSuccessfulRows] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "info">("info");
  const [mainOperation, setMainOperation] = useState<MainOperation | null>(null);
  const [fileDelivery, setFileDelivery] = useState<FileDeliveryOperation | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const mainOperationRef = useRef<MainOperation | null>(null);
  const fileDeliveryRef = useRef<FileDeliveryOperation | null>(null);
  const preflightRunId = useRef(0);
  const mounted = useRef(true);
  const mappingTitleRef = useRef<HTMLHeadingElement>(null);
  const previewTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortController.current?.abort();
      mainOperationRef.current = null;
      fileDeliveryRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase === "mapping" && file) {
      mappingTitleRef.current?.focus();
    } else if (phase === "ready" && plan) {
      previewTitleRef.current?.focus();
    }
  }, [file, phase, plan]);

  const writableCandidates = useMemo(
    () => plan?.imports ?? [],
    [plan]
  );
  const pendingCandidates = useMemo(
    () => writableCandidates.filter((candidate) => !successfulRows.has(candidate.rowNumber)),
    [successfulRows, writableCandidates]
  );
  const unknownHourCount = useMemo(
    () => plan?.imports.filter((candidate) => candidate.input.timePrecision === "unknown_hour").length ?? 0,
    [plan]
  );
  const problemRows = useMemo(
    () => plan?.rows.filter((row) => row.status !== "ready") ?? [],
    [plan]
  );
  const writeResultSummary = useMemo(() => {
    const failed: WriteResult[] = [];
    let imported = 0;
    let commitUnknown = 0;
    for (const result of writeResults.values()) {
      if (result.status === "failed") failed.push(result);
      else if (result.status === "imported") imported += 1;
      else if (result.status === "commit_unknown") commitUnknown += 1;
    }
    return { failed, imported, commitUnknown };
  }, [writeResults]);
  const failedWrites = writeResultSummary.failed;

  const beginMainOperation = (operation: MainOperation): boolean => {
    if (writeReconciliationIssue || preparedDelivery || !mounted.current || mainOperationRef.current !== null || fileDeliveryRef.current !== null) return false;
    mainOperationRef.current = operation;
    setMainOperation(operation);
    return true;
  };

  const finishMainOperation = (operation: MainOperation) => {
    if (mainOperationRef.current !== operation) return;
    mainOperationRef.current = null;
    if (mounted.current) setMainOperation(null);
  };

  const resetForFile = async (pickedFile: PickedFile) => {
    // Invalidate a previously preflighted plan before parsing the new file. If
    // header parsing fails, no stale plan remains available for submission.
    preflightRunId.current += 1;
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPlan(null);
    setSourceProgress(null);
    setPreflightProgress(null);
    setWriteProgress(null);
    setWriteResults(new Map());
    setSuccessfulRows(new Set());
    setError(null);
    setMessage(null);
    setPhase("reading");
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const nextHeaders = await readCaseImportHeadersOffMainThread(pickedFile.blob, controller.signal);
      if (!mounted.current) return;
      if (nextHeaders.length === 0) throw new Error("CSV 没有可映射的表头列。");
      if (nextHeaders.length > MAX_CSV_COLUMNS) {
        throw new Error(`CSV 包含 ${nextHeaders.length} 列，超过 ${MAX_CSV_COLUMNS} 列的映射上限。`);
      }
      const oversizedHeaderIndex = nextHeaders.findIndex((header) => header.length > MAX_CSV_HEADER_CHARACTERS);
      if (oversizedHeaderIndex >= 0) {
        throw new Error(`CSV 第 ${oversizedHeaderIndex + 1} 列表头超过 ${MAX_CSV_HEADER_CHARACTERS} 个字符。`);
      }
      setFile(pickedFile);
      setHeaders(nextHeaders);
      setMapping(inferMapping(nextHeaders));
      setPhase("mapping");
    } catch (reason) {
      if (!mounted.current) return;
      setPhase("idle");
      if (isCancellation(reason)) {
        setMessageTone("info");
        setMessage("已取消表头读取；没有保留不完整文件。可重新选择 CSV。");
      } else {
        setError(getErrorMessage(reason, "无法解析 CSV 表头。请检查文件编码和引号。"));
      }
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const runPreflight = async () => {
    if (writeReconciliationIssue || !file || !beginMainOperation("preflight")) return;
    const runId = preflightRunId.current + 1;
    preflightRunId.current = runId;
    setPlan(null);
    setSourceProgress(null);
    setPreflightProgress(null);
    setWriteProgress(null);
    setWriteResults(new Map());
    setSuccessfulRows(new Set());
    setError(null);
    setMessage(null);
    setPhase("preflighting");
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const existingFingerprints = await caseRepository.listBirthFingerprints();
      if (controller.signal.aborted) throw new CaseImportCancelledError();
      const nextPlan = await buildCaseImportPlanOffMainThread(file.blob, {
        mapping: toColumnMapping(mapping),
        duplicatePolicy,
        existingFingerprints,
        chunkSize: 100,
        signal: controller.signal,
        onSourceProgress: (progress) => {
          if (!mounted.current || controller.signal.aborted || preflightRunId.current !== runId) return;
          startTransition(() => setSourceProgress((current) => {
            if (preflightRunId.current !== runId) return current;
            return current && progress.percent < current.percent ? current : progress;
          }));
        },
        onProgress: (progress) => {
          if (!mounted.current || controller.signal.aborted || preflightRunId.current !== runId) return;
          startTransition(() => setPreflightProgress((current) => {
            if (preflightRunId.current !== runId) return current;
            return current && progress.percent < current.percent ? current : progress;
          }));
        }
      });
      if (!mounted.current || preflightRunId.current !== runId) return;
      const planIssue = caseImportPlanIntegrityIssue(nextPlan, headers);
      if (planIssue) throw new Error(`后台预检计划未通过完整性校验：${planIssue}`);
      preflightRunId.current += 1;
      setPlan(nextPlan);
      setSourceProgress(null);
      setPreflightProgress(null);
      setPhase("ready");
      setMessageTone("info");
      setMessage(
        `预检完成：${nextPlan.stats.totalRows} 行中，${nextPlan.stats.importableRows} 行通过格式校验；精确记录与未知时辰候选组都会在写入前重新计算。`
      );
    } catch (reason) {
      if (!mounted.current || preflightRunId.current !== runId) return;
      preflightRunId.current += 1;
      setSourceProgress(null);
      setPreflightProgress(null);
      setPhase("mapping");
      if (isCancellation(reason)) {
        setMessageTone("info");
        setMessage("已取消预检；没有写入任何案例。可重新选择文件开始。");
      } else {
        setError(getErrorMessage(reason, "CSV 预检失败。请检查表头和文件编码。"));
      }
    } finally {
      if (abortController.current === controller) abortController.current = null;
      finishMainOperation("preflight");
    }
  };

  const chooseFile = async () => {
    if (!beginMainOperation("choose_file")) return;
    setError(null);
    try {
      const pickedFile = await pickFile({ accept: ".csv,text/csv,text/plain", maxBytes: MAX_CSV_BYTES });
      if (pickedFile && mounted.current) await resetForFile(preparePickedCsvFile(pickedFile));
    } catch (reason) {
      if (mounted.current) setError(getErrorMessage(reason, "无法读取 CSV 文件。"));
    } finally {
      finishMainOperation("choose_file");
    }
  };

  const invalidatePreparedPlan = () => {
    preflightRunId.current += 1;
    setPlan(null);
    setSourceProgress(null);
    setPreflightProgress(null);
    setWriteProgress(null);
    setWriteResults(new Map());
    setSuccessfulRows(new Set());
    setMessage(null);
    setError(null);
    setPhase("mapping");
  };

  const updateMapping = (field: CaseImportField, columnIndex: string) => {
    if (writeReconciliationIssue || mainOperationRef.current !== null) return;
    setMapping((current) => ({ ...current, [field]: columnIndex === "" ? undefined : Number(columnIndex) }));
    invalidatePreparedPlan();
  };

  const updateDuplicatePolicy = (policy: DuplicatePolicy) => {
    if (writeReconciliationIssue || mainOperationRef.current !== null) return;
    setDuplicatePolicy(policy);
    invalidatePreparedPlan();
  };

  const cancelCurrentOperation = () => {
    abortController.current?.abort();
  };

  const beginFileDelivery = (operation: FileDeliveryOperation): boolean => {
    if (preparedDelivery || !mounted.current || mainOperationRef.current !== null || fileDeliveryRef.current !== null) return false;
    fileDeliveryRef.current = operation;
    setFileDelivery(operation);
    return true;
  };

  const finishFileDelivery = (operation: FileDeliveryOperation) => {
    if (fileDeliveryRef.current !== operation) return;
    fileDeliveryRef.current = null;
    if (mounted.current) setFileDelivery(null);
  };

  const busy = mainOperation !== null || phase === "reading" || phase === "preflighting" || phase === "importing";
  const fileDeliveryBusy = fileDelivery !== null;
  const deliveryOpen = preparedDelivery !== null;
  const controlsLocked = busy || fileDeliveryBusy || deliveryOpen;
  const combinedPreflightPercent = Math.min(100, Math.max(0, preflightProgress
    ? 30 + preflightProgress.percent * 0.7
    : sourceProgress
      ? sourceProgress.percent * 0.3
      : 0));

  const importRows = async () => {
    if (writeReconciliationIssue || !plan || pendingCandidates.length === 0 || !beginMainOperation("import")) return;
    if (!acquireMutation || !releaseMutation) {
      if (mounted.current) {
        setMessage(null);
        setError("当前页面没有同时提供 mutation epoch 的取得与释放回调，批量写入已关闭。");
      }
      finishMainOperation("import");
      return;
    }
    let mutationLeaseAcquired = false;
    try {
      mutationLeaseAcquired = acquireMutation();
    } catch (reason) {
      if (mounted.current) {
        setMessage(null);
        setError(`无法取得案例库写入租约，本次导入尚未启动：${getErrorMessage(reason, "请稍后重试。")}`);
      }
      finishMainOperation("import");
      return;
    }
    if (!mutationLeaseAcquired) {
      if (mounted.current) {
        setMessage(null);
        setError("案例库当前被另一项写入占用，本次导入尚未启动。请等待当前写入完成后重试。");
      }
      finishMainOperation("import");
      return;
    }
    let mutationLeaseHeld = true;
    const releaseMutationLease = () => {
      if (!mutationLeaseHeld) return;
      mutationLeaseHeld = false;
      releaseMutation();
    };
    setPhase("importing");
    setError(null);
    setMessage(null);
    const controller = new AbortController();
    abortController.current = controller;
    let processed = 0;
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    let concurrentDuplicateDetected = false;
    let writeReconciliationIssueDetected: ImportWriteReconciliationIssue | null = null;
    let cancelled = false;
    const total = pendingCandidates.length;
    const nextSuccessfulRows = new Set(successfulRows);
    const nextWriteResults = new Map(writeResults);
    const flushProgress = () => {
      if (!mounted.current) return;
      setSuccessfulRows(new Set(nextSuccessfulRows));
      setWriteResults(new Map(nextWriteResults));
      setWriteProgress({ total, processed, imported, failed, skipped });
    };
    setWriteProgress({ total, processed, imported, failed, skipped });

    let rulePackContext;
    try {
      rulePackContext = await loadActiveRulePackContext(APP_VERSION);
    } catch (reason) {
      if (mounted.current) {
        setPhase("ready");
        setError(`活动规则包不可用，整批尚未写入：${getErrorMessage(reason, "请到设置页明确停用或更换规则包。")}`);
      }
      if (abortController.current === controller) abortController.current = null;
      finishMainOperation("import");
      releaseMutationLease();
      return;
    }
    const calculationOptions = rulePackContext.source === "installed"
      ? { rulePackBinding: rulePackContext.binding }
      : undefined;

    for (const candidate of pendingCandidates) {
      if (controller.signal.aborted) {
        cancelled = true;
        break;
      }
      let storageCallStarted = false;
      try {
        const isUnknownHour = candidate.input.timePrecision === "unknown_hour";
        if (isUnknownHour) {
          const candidateSet = await calculateUnknownHourCandidates(
            candidate.input,
            rulePackContext.profile,
            calculationOptions
          );
          if (controller.signal.aborted) {
            cancelled = true;
            break;
          }
          storageCallStarted = true;
          await caseRepository.createCandidateSet({
            alias: candidate.alias,
            tags: candidate.tags,
            notes: candidate.sourceNote,
            candidateSet,
            duplicateGuard: duplicatePolicy === "import_copy" ? "allow" : "reject"
          });
        } else {
          const chart = await calculateChart(candidate.input, rulePackContext.profile, calculationOptions);
          if (controller.signal.aborted) {
            cancelled = true;
            break;
          }
          storageCallStarted = true;
          await caseRepository.createCase({
            alias: candidate.alias,
            tags: candidate.tags,
            notes: candidate.sourceNote,
            calculated: chart,
            duplicateGuard: duplicatePolicy === "import_copy" ? "allow" : "reject"
          });
        }
        storageCallStarted = false;
        imported += 1;
        nextSuccessfulRows.add(candidate.rowNumber);
        nextWriteResults.set(candidate.rowNumber, {
          rowNumber: candidate.rowNumber,
          alias: candidate.alias,
          status: "imported",
          message: isUnknownHour
            ? "13 个未知时辰探针已计算并作为候选组写入；未指定主盘。"
            : "命盘已计算并作为独立案例写入本地数据库。"
        });
      } catch (reason) {
        const concurrentDuplicate = reason instanceof DuplicateBirthFingerprintError;
        if (concurrentDuplicate) concurrentDuplicateDetected = true;
        if (storageCallStarted && !concurrentDuplicate) {
          const detail = getErrorMessage(reason, "存储调用未返回可确认结果。");
          writeReconciliationIssueDetected = { rowNumber: candidate.rowNumber, detail };
          nextWriteResults.set(candidate.rowNumber, {
            rowNumber: candidate.rowNumber,
            alias: candidate.alias,
            status: "commit_unknown",
            message: `写入结果未知（并非已确认失败）：${detail}`
          });
          if (mounted.current) setWriteReconciliationIssue(writeReconciliationIssueDetected);
        } else if (concurrentDuplicate && duplicatePolicy === "skip") {
          skipped += 1;
          nextSuccessfulRows.add(candidate.rowNumber);
          nextWriteResults.set(candidate.rowNumber, {
            rowNumber: candidate.rowNumber,
            alias: candidate.alias,
            status: "skipped_duplicate",
            message: "预检后已有其他页面写入相同出生输入；本行已按跳过策略安全跳过。"
          });
        } else {
          failed += 1;
          nextWriteResults.set(candidate.rowNumber, {
            rowNumber: candidate.rowNumber,
            alias: candidate.alias,
            status: "failed",
            message: concurrentDuplicate
              ? "预检后检测到相同出生输入；本行已按标错策略拒绝写入。"
              : getErrorMessage(reason, "候选/排盘计算或案例写入失败。")
          });
        }
      }
      processed += 1;
      if (processed % 25 === 0 || processed === total) flushProgress();
      if (writeReconciliationIssueDetected) break;
    }

    if (!mounted.current) {
      finishMainOperation("import");
      if (!writeReconciliationIssueDetected) releaseMutationLease();
      return;
    }
    flushProgress();
    setPhase("ready");
    if (writeReconciliationIssueDetected) {
      setMessageTone("info");
      setMessage(`批次已在第 ${writeReconciliationIssueDetected.rowNumber} 行熔断：成功 ${imported} 行、跳过重复 ${skipped} 行；该行写入结果未知，当前页面不会释放案例库写锁或自动重试。`);
    } else if (cancelled || controller.signal.aborted) {
      setMessageTone("info");
      setMessage(`已在行边界停止：本轮成功 ${imported} 行、跳过重复 ${skipped} 行、失败 ${failed} 行；已提交的案例保留，剩余行可继续导入。`);
    } else {
      setMessageTone(failed === 0 ? "success" : "info");
      setMessage(`本轮完成：成功写入 ${imported} 行，提交时跳过重复 ${skipped} 行，失败 ${failed} 行。坏行不会阻塞其他记录，可准备完整报告复核。`);
    }
    if (abortController.current === controller) abortController.current = null;
    if ((imported > 0 || concurrentDuplicateDetected || writeReconciliationIssueDetected) && onImported) {
      try {
        await onImported();
      } catch (reason) {
        if (mounted.current) {
          setError(`数据已经写入，但页面列表刷新失败：${getErrorMessage(reason, "请手动刷新页面。")}`);
        }
      }
    }
    finishMainOperation("import");
    if (!writeReconciliationIssueDetected) releaseMutationLease();
  };

  const downloadTemplate = async () => {
    if (!beginFileDelivery("template")) return;
    setError(null);
    setMessage(null);
    try {
      const content = `\ufeff${[csvLine(TEMPLATE_HEADERS), csvLine(TEMPLATE_EXAMPLE)].join("\r\n")}`;
      if (!mounted.current) return;
      setPreparedDelivery({
        blob: prepareCsvDeliveryArtifact(content),
        filename: "hakimi-bazi-case-import-template.csv",
        title: "八字案例 CSV 导入模板",
        sharePolicy: "allowed",
        description: "固定列名与虚构示例已经冻结；其中不含当前案例库数据，可下载、保存到指定位置或交给协作者填写。"
      });
      setMessageTone("info");
      setMessage("CSV 模板已准备；同一份冻结内容将用于后续下载、指定位置保存或系统分享，目前尚未发生交付。范例不会写入案例库。");
    } catch (reason) {
      if (mounted.current) setError(getErrorMessage(reason, "CSV 模板未能完成冻结准备。"));
    } finally {
      finishFileDelivery("template");
    }
  };

  const downloadReport = async () => {
    if (!plan || busy || !beginFileDelivery("report")) return;
    setError(null);
    setMessage(null);
    try {
      const reportDate = new Date().toISOString().slice(0, 10);
      const content = makeReport(plan, writeResults);
      if (!mounted.current) return;
      setPreparedDelivery({
        blob: prepareCsvDeliveryArtifact(content),
        filename: `hakimi-bazi-import-report-${reportDate}.csv`,
        title: `CSV 预检/导入报告 · ${reportDate}`,
        sharePolicy: "blocked_sensitive",
        description: "完整逐行报告已经冻结，可能包含案例别名、来源备注、错误细节和提交结果；只能下载或保存到可信位置，不能进入系统分享。"
      });
      setMessageTone("info");
      setMessage("完整报告已准备；同一份冻结内容将用于后续下载或指定位置保存，目前尚未发生交付。报告可能包含敏感案例信息，系统分享保持关闭。");
    } catch (reason) {
      if (mounted.current) setError(getErrorMessage(reason, "CSV 预检/导入报告未能完成冻结准备。"));
    } finally {
      finishFileDelivery("report");
    }
  };

  const mappedFieldCount = MAPPING_FIELDS.filter((field) => mapping[field.key] !== undefined).length;
  const requiredMappedCount = REQUIRED_MAPPING_DEFINITIONS.filter((field) => mapping[field.key] !== undefined).length;
  const mappingConflicts = useMemo(() => findMappingConflicts(mapping), [mapping]);
  const mappingReady = hasRequiredMapping(mapping) && mappingConflicts.length === 0;
  const visibleFileName = file ? safeImportText(file.name, "未命名 CSV 文件", 180) : null;
  const visibleHeaders = useMemo(
    () => headers.map((header) => safeImportText(header, "（空表头）", 160)),
    [headers]
  );
  const renderMappingField = (field: (typeof MAPPING_FIELDS)[number]) => (
    <label key={field.key} data-required={field.required ? "true" : "false"}>
      <span>{field.label}{field.required ? <em>必填</em> : null}</span>
      <select
        value={mapping[field.key] ?? ""}
        onChange={(event) => updateMapping(field.key, event.target.value)}
        disabled={controlsLocked || Boolean(writeReconciliationIssue)}
      >
        <option value="">不映射</option>
        {visibleHeaders.map((header, index) => <option key={`column-${index}`} value={index}>{index + 1} · {header}</option>)}
      </select>
    </label>
  );

  return (
    <section
      className="case-import-panel"
      aria-labelledby={importerTitleId}
      aria-busy={busy || fileDeliveryBusy}
      {...CASE_IMPORT_SAFETY_ATTRIBUTES}
      data-write-reconciliation-required={Boolean(writeReconciliationIssue)}
      data-record-write-performed={writeResultSummary.imported > 0 ? "true" : "false"}
      data-record-write-state={writeReconciliationIssue || writeResultSummary.commitUnknown > 0 ? "unknown" : phase === "importing" ? "in_progress" : writeResultSummary.imported > 0 ? "performed" : "not_started"}
      data-confirmed-imported-row-count={writeResultSummary.imported}
      data-commit-unknown-row-count={writeResultSummary.commitUnknown}
      data-phase={phase}
      data-operation={mainOperation ?? fileDelivery ?? "idle"}
      data-mutation-epoch-ready={mutationEpochReady}
      data-mutation-epoch-state={writeReconciliationIssue ? "held_for_reconciliation" : phase === "importing" ? "held" : "not_held"}
      data-delivery-open={deliveryOpen}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <div className="case-import-heading">
        <div>
          <p className="eyebrow">CSV BATCH INTAKE / 批量导入</p>
          <h2 id={importerTitleId}>批量导入案例</h2>
          <p>读取 UTF-8 CSV 后先映射字段，再由后台线程分块预检并逐行写入；首版单文件上限 {caseImportNumberFormatter.format(MAX_CASE_IMPORT_ROWS)} 行，单条逻辑记录上限 {caseImportNumberFormatter.format(MAX_CASE_IMPORT_RECORD_CHARACTERS)} 个字符。错误行、超限行与重复行不会阻塞其他有效记录。</p>
        </div>
        <StatusPill tone="info">精确盘 + 未知时辰候选组</StatusPill>
      </div>

      <div className="case-import-boundary">
        <AlertTriangle aria-hidden="true" />
        <p><strong>未知时辰仍然不会被补成某个出生时刻。</strong> `unknown_hour` 行会保存原始 <code>time=null</code>、13 个代表性探针和完整快照；它是可重开的候选组，不是已确定主盘。</p>
      </div>

      <aside className="case-import-delivery-boundary" aria-label="CSV 文件交付策略">
        <span className="case-import-delivery-boundary__icon" aria-hidden="true"><FileDown /></span>
        <div>
          <p className="eyebrow">File delivery boundary</p>
          <strong>模板可协作，完整报告仅限可信位置</strong>
          <p>所有文件先冻结再交付。模板只有固定列名与虚构示例；报告可能包含案例别名、来源备注与逐行处理结果，不会开放系统分享，也不代表专家核验或公开发布授权。</p>
        </div>
        <div className="case-import-delivery-boundary__policies" aria-label="交付策略摘要">
          <span data-policy="baseline">legacy-v13 · S13 · migration null</span>
          <span data-policy="share">模板 · 可指定分享</span>
          <span data-policy="private">报告 · 禁止系统分享</span>
        </div>
      </aside>

      <ol className="case-import-stage-rail" aria-label="CSV 导入阶段">
        <li data-state={phase === "idle" ? "current" : phase === "reading" ? "active" : "complete"}>
          <span>01</span>
          <div><strong>选择源文件</strong><small>{phase === "reading" ? "读取表头中" : file ? `${headers.length} 列已识别` : "等待 UTF-8 CSV"}</small></div>
        </li>
        <li data-state={phase === "preflighting" ? "active" : plan ? "complete" : file ? "current" : "pending"}>
          <span>02</span>
          <div><strong>映射与预检</strong><small>{phase === "preflighting" ? "后台分块校验" : plan ? `${plan.stats.importableRows} 行通过` : mappingConflicts.length ? `${mappingConflicts.length} 处列冲突` : file ? `${requiredMappedCount} / ${REQUIRED_MAPPING_DEFINITIONS.length} 项必填` : "选择文件后开放"}</small></div>
        </li>
        <li data-state={phase === "importing" ? "active" : plan && pendingCandidates.length === 0 && plan.imports.length > 0 ? "complete" : plan ? "current" : "pending"}>
          <span>03</span>
          <div><strong>逐行计算并提交</strong><small>{phase === "importing" ? `${writeProgress?.processed ?? 0} / ${writeProgress?.total ?? pendingCandidates.length} 行` : writeReconciliationIssue ? `第 ${writeReconciliationIssue.rowNumber} 行待核对` : plan ? `${pendingCandidates.length} 行待处理` : "预检后显式执行"}</small></div>
        </li>
      </ol>

      <div className="case-import-actions">
        <button type="button" className="secondary-action" onClick={() => void downloadTemplate()} disabled={controlsLocked} aria-busy={fileDelivery === "template"}><FileDown aria-hidden="true" />{fileDelivery === "template" ? "正在准备模板" : "准备 CSV 模板"}</button>
        <button type="button" className="primary-action" onClick={() => void chooseFile()} disabled={controlsLocked || Boolean(writeReconciliationIssue)}><FileUp aria-hidden="true" />{mainOperation === "choose_file" && phase !== "reading" ? "等待文件选择" : "选择 CSV"}</button>
        {phase === "reading" || phase === "preflighting" || phase === "importing" ? <button type="button" className="secondary-action" onClick={cancelCurrentOperation}><X aria-hidden="true" />{phase === "reading" ? "取消读取" : phase === "preflighting" ? "取消预检" : "停止导入"}</button> : null}
      </div>

      <details className="case-import-columns">
        <summary>查看模板列名与取值约定</summary>
        <p><code>{TEMPLATE_HEADERS.join(",")}</code></p>
        <p>标签用 <code>|</code> 分隔；时间精度用 <code>精确到分钟/exact_minute</code> 或 <code>未知时辰/unknown_hour</code>；时区必须是 IANA 名称，例如 <code>Asia/Shanghai</code>。</p>
      </details>

      {file ? (
        <div className="case-import-file">
          <span className="case-import-file__mark" aria-hidden="true"><FileUp /></span>
          <div>
            <p className="eyebrow">Active CSV source</p>
            <strong title={visibleFileName ?? undefined}>{visibleFileName}</strong>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <dl>
            <div><dt>表头列</dt><dd>{headers.length}</dd></div>
            <div><dt>已映射</dt><dd>{mappedFieldCount} / {MAPPING_FIELDS.length}</dd></div>
            <div><dt>重复策略</dt><dd>{duplicatePolicy === "skip" ? "安全跳过" : duplicatePolicy === "error" ? "明确标错" : "允许副本"}</dd></div>
          </dl>
        </div>
      ) : null}

      {phase === "reading" ? (
        <div className="case-import-progress" role="status" aria-live="polite">
          <div><strong>正在后台读取表头</strong><span>长表头与引号记录不会占用页面主线程</span></div>
          <progress aria-label="CSV 表头读取进度" />
        </div>
      ) : null}

      {file ? (
        <section className="case-import-mapping" aria-labelledby="case-import-mapping-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">Column mapping</p><h3 ref={mappingTitleRef} id="case-import-mapping-title" tabIndex={-1}>字段映射</h3></div>
            <StatusPill tone={mappingConflicts.length ? "cinnabar" : mappingReady ? "info" : "warning"}>{mappingConflicts.length ? `${mappingConflicts.length} 处列冲突` : mappingReady ? "映射可预检" : "等待必填映射"}</StatusPill>
          </div>
          <p className="section-help">左侧是研究台字段，右侧选择此文件中的列。模板列会自动识别；重复列名仍按实际列序号区分。</p>
          {mappingConflicts.length ? <div className="case-import-mapping-conflict" role="alert"><strong>同一 CSV 列不能承担多个研究字段</strong><ul>{mappingConflicts.map((conflict) => <li key={conflict.columnIndex}>第 {conflict.columnIndex + 1} 列“{safeImportText(headers[conflict.columnIndex], "空表头", 160)}”：{conflict.fields.join("、")}</li>)}</ul></div> : null}
          <div className="case-import-mapping-group case-import-mapping-group--required">
            <header>
              <div><p className="eyebrow">Required mapping</p><h4>必填字段</h4></div>
              <StatusPill tone={requiredMappedCount === REQUIRED_MAPPING_DEFINITIONS.length ? "info" : "warning"}>{requiredMappedCount} / {REQUIRED_MAPPING_DEFINITIONS.length}</StatusPill>
            </header>
            <div className="case-import-mapping-grid">
              {REQUIRED_MAPPING_DEFINITIONS.map(renderMappingField)}
            </div>
          </div>
          <details className="case-import-mapping-group case-import-mapping-group--optional" open={mappedFieldCount > REQUIRED_MAPPING_DEFINITIONS.length}>
            <summary>
              <span><strong>可选字段</strong><small>历法、时间、地点、标签与来源备注</small></span>
              <StatusPill tone="neutral">{mappedFieldCount - requiredMappedCount} / {OPTIONAL_MAPPING_DEFINITIONS.length}</StatusPill>
            </summary>
            <div className="case-import-mapping-grid">
              {OPTIONAL_MAPPING_DEFINITIONS.map(renderMappingField)}
            </div>
          </details>
          <div className="case-import-mapping-footer">
            <div className="case-import-duplicate-policy">
              <label className="field"><span>重复出生输入策略</span><select value={duplicatePolicy} disabled={controlsLocked || Boolean(writeReconciliationIssue)} onChange={(event) => updateDuplicatePolicy(event.target.value as DuplicatePolicy)}><option value="skip">跳过重复（推荐）</option><option value="import_copy">作为副本导入</option><option value="error">标记为错误</option></select></label>
              <p>策略同时用于预检和提交事务；提交时仍会再次检查并发写入。</p>
            </div>
            <button type="button" className="primary-action" disabled={!mappingReady || controlsLocked || Boolean(writeReconciliationIssue)} onClick={() => void runPreflight()}><FileUp aria-hidden="true" />{mappingConflicts.length ? "先解决映射冲突" : "按此映射预检"}</button>
          </div>
        </section>
      ) : null}

      {phase === "preflighting" ? (
        <div className="case-import-progress" role="status" aria-live="polite">
          <div><strong>正在预检</strong><span>{preflightProgress
            ? `${preflightProgress.processedRows} / ${preflightProgress.totalRows} 行`
            : sourceProgress
              ? `扫描 ${caseImportNumberFormatter.format(sourceProgress.processedUnits)} / ${caseImportNumberFormatter.format(sourceProgress.totalUnits)} ${sourceProgressUnitLabel(sourceProgress.unit)} · ${sourceProgress.parsedRecords} 条记录`
              : "正在读取表头与已有指纹"}</span></div>
          <progress max={100} value={combinedPreflightPercent} aria-label="CSV 预检进度" />
        </div>
      ) : null}

      {phase === "importing" && writeProgress ? (
        <div className="case-import-progress" role="status" aria-live="polite">
          <div><strong>正在逐行计算并写入</strong><span>{writeProgress.processed} / {writeProgress.total} 行 · 成功 {writeProgress.imported} · 跳过 {writeProgress.skipped} · 失败 {writeProgress.failed}</span></div>
          <progress max={writeProgress.total || 1} value={writeProgress.processed} aria-label="案例写入进度" />
          <small>停止操作会在当前行边界生效；已经提交的案例不会撤销。</small>
        </div>
      ) : null}

      {error ? <div className="inline-error" role="alert"><strong>CSV 操作未完成</strong><p>{safeImportText(error, "请检查文件后重试。")}</p></div> : null}
      {message ? <p className="success-message" data-tone={messageTone} role="status">{safeImportText(message, "CSV 操作状态不可用。")}</p> : null}

      {plan ? (
        <div className="case-import-preview">
          <header className="case-import-preview__heading">
            <div><p className="eyebrow">Preflight ledger</p><h3 ref={previewTitleRef} tabIndex={-1}>逐行预检结果</h3><p>预检只生成计划；下方确认按钮才会开始真实排盘计算与本地写入。</p></div>
            <StatusPill tone={plan.stats.invalidRows ? "warning" : "info"}>{plan.stats.invalidRows ? `${plan.stats.invalidRows} 行需复核` : "格式校验通过"}</StatusPill>
          </header>
          <div className="case-import-stats" role="group" aria-label="CSV 预检统计">
            <div><strong>{plan.stats.totalRows}</strong><span>数据行</span></div>
            <div><strong>{writableCandidates.length - unknownHourCount}</strong><span>精确时间可写入</span></div>
            <div><strong>{unknownHourCount}</strong><span>未知时辰候选组</span></div>
            <div><strong>{plan.stats.invalidRows}</strong><span>格式错误</span></div>
            <div><strong>{plan.stats.skippedRows}</strong><span>重复跳过</span></div>
          </div>

          {!mutationEpochReady ? <div className="inline-error" role="alert"><strong>批量写入已关闭</strong><p>当前页面没有同时提供 mutation epoch 的取得与释放回调；预检与报告仍可使用，但不能提交案例。</p></div> : null}
          {writeReconciliationIssue ? (
            <section className="case-import-reconciliation" role="alert" aria-live="assertive">
              <AlertTriangle aria-hidden="true" size={20} />
              <div>
                <strong>第 {writeReconciliationIssue.rowNumber} 行的写入结果未知</strong>
                <p>存储调用已经发出，但没有收到可确认结果。当前批次已停止，案例库写锁会继续保留；不要重试该行，请重新载入后先核对案例索引。此状态不是“写入失败”的确认结论。</p>
                <small>{safeImportText(writeReconciliationIssue.detail, "存储调用未返回可确认结果。", 280)}</small>
              </div>
              <button className="secondary-action" type="button" onClick={() => window.location.reload()}>
                <RotateCcw aria-hidden="true" />重新载入并核对
              </button>
            </section>
          ) : null}
          <div className="case-import-actions case-import-actions--commit">
            <p><strong>{mutationEpochReady ? "提交边界 · 共享写锁" : "提交边界 · 写锁未接入"}</strong><span>逐行重新计算并写入；失败行不会回滚已经成功提交的其他行。</span></p>
            <button type="button" className="primary-action" disabled={!mutationEpochReady || pendingCandidates.length === 0 || phase !== "ready" || controlsLocked || Boolean(writeReconciliationIssue)} onClick={() => void importRows()}>
              {successfulRows.size > 0 || failedWrites.length > 0 ? <RotateCcw aria-hidden="true" /> : <FileUp aria-hidden="true" />}
              {pendingCandidates.length ? `${successfulRows.size > 0 || failedWrites.length > 0 ? "继续/重试" : "导入"} ${pendingCandidates.length} 条记录` : "没有待导入记录"}
            </button>
            <button type="button" className="secondary-action" disabled={controlsLocked} aria-busy={fileDelivery === "report"} onClick={() => void downloadReport()}><FileDown aria-hidden="true" />{fileDelivery === "report" ? "正在准备报告" : "准备完整预检/导入报告"}</button>
          </div>

          {problemRows.length ? (
            <details className="case-import-problems" open={problemRows.length <= 12}>
              <summary>查看错误与重复行（{problemRows.length}）</summary>
              <div className="case-import-table-wrap" role="region" aria-label="CSV 错误与重复行明细，可横向滚动" tabIndex={0}>
                <table className="case-import-table">
                  <caption className="sr-only">CSV 预检与导入中的错误、重复行明细</caption>
                  <thead><tr><th scope="col">CSV 行</th><th scope="col">案例</th><th scope="col">状态</th><th scope="col">详情</th></tr></thead>
                  <tbody>
                    {problemRows.slice(0, ROW_PREVIEW_LIMIT).map((row) => {
                      const status = preflightRowStatus(row);
                      return (
                        <tr key={`${row.recordNumber}-${row.rowNumber}`}>
                          <td>{row.rowNumber}</td>
                          <td>{rowAlias(row) || "—"}</td>
                          <td><StatusPill tone={row.status === "invalid" ? "cinnabar" : "warning"}>{safeImportText(status.label, "需复核", 80)}</StatusPill></td>
                          <td>{safeImportText(status.detail, "该行未通过预检。")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {problemRows.length > ROW_PREVIEW_LIMIT ? <p className="muted-copy">界面只显示前 {ROW_PREVIEW_LIMIT} 行；准备完整报告可复核全部逐行错误。</p> : null}
            </details>
          ) : <p className="case-import-clean">格式预检没有发现错误或重复行；未知时辰会作为候选组正常写入。</p>}

          {failedWrites.length ? (
            <div className="case-import-write-errors" role="alert">
              <strong>{failedWrites.length} 行在排盘计算或写库时失败</strong>
              <ul>{failedWrites.slice(0, ROW_PREVIEW_LIMIT).map((result) => <li key={result.rowNumber}>第 {result.rowNumber} 行 · {safeImportText(result.alias, "未命名案例", 240)}：{safeImportText(result.message, "写入失败。")}</li>)}</ul>
              {failedWrites.length > ROW_PREVIEW_LIMIT ? <p className="muted-copy">界面只显示前 {ROW_PREVIEW_LIMIT} 行；准备完整报告可复核全部失败记录。</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
