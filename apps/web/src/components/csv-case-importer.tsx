import { AlertTriangle, FileDown, FileUp, RotateCcw, X } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  CaseImportCancelledError,
  MAX_CASE_IMPORT_RECORD_CHARACTERS,
  MAX_CASE_IMPORT_ROWS,
  type CaseImportColumnMapping,
  type CaseImportField,
  type CaseImportPlan,
  type CaseImportProgress,
  type CaseImportRow,
  type CsvSourceProgress,
  type DuplicatePolicy
} from "@hakimi/case-import";
import { pickFile, saveTextFile, type PickedFile } from "@hakimi/platform";
import { caseRepository, DuplicateBirthFingerprintError } from "@hakimi/storage";
import { APP_VERSION } from "../lib/app-version";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { loadActiveRulePackContext } from "../lib/active-rule-pack";
import {
  buildCaseImportPlanOffMainThread,
  readCaseImportHeadersOffMainThread
} from "../lib/case-import-worker-client";
import { StatusPill } from "./status-pill";

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const ROW_PREVIEW_LIMIT = 200;

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

type WriteResult = {
  rowNumber: number;
  alias: string;
  status: "imported" | "failed" | "skipped_duplicate";
  message: string;
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
};

function csvCell(rawValue: string): string {
  const value = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvLine(values: readonly string[]): string {
  return values.map(csvCell).join(",");
}

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
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

function toColumnMapping(mapping: MappingState): CaseImportColumnMapping {
  if (!hasRequiredMapping(mapping)) throw new Error("请先映射全部必填字段。");
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
  if (row.status === "ready") return row.candidate.alias;
  if (row.status === "invalid" && row.candidate) return row.candidate.alias;
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
      detail: row.errors.map((error) => `[${error.code}]${error.field ? ` ${error.field}:` : ""} ${error.message}`).join(" | ")
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

function makeReport(plan: CaseImportPlan, writeResults: ReadonlyMap<number, WriteResult>): string {
  const header = ["CSV行", "记录号", "案例别名", "时间精度", "状态", "详情"];
  const rows = plan.rows.map((row) => {
    const preflight = preflightRowStatus(row);
    const writeResult = writeResults.get(row.rowNumber);
    return [
      String(row.rowNumber),
      String(row.recordNumber),
      rowAlias(row),
      rowPrecision(row),
      writeResult
        ? writeResult.status === "imported"
          ? "已导入"
          : writeResult.status === "skipped_duplicate"
            ? "提交时跳过重复"
            : "写入失败"
        : preflight.label,
      writeResult?.message ?? preflight.detail
    ];
  });
  return `\ufeff${[header, ...rows].map(csvLine).join("\r\n")}`;
}

export function CsvCaseImporter({ onImported }: CsvCaseImporterProps) {
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
  const [successfulRows, setSuccessfulRows] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const preflightRunId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortController.current?.abort();
    };
  }, []);

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
  const failedWrites = useMemo(
    () => [...writeResults.values()].filter((result) => result.status === "failed"),
    [writeResults]
  );

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
      setFile(pickedFile);
      setHeaders(nextHeaders);
      setMapping(inferMapping(nextHeaders));
      setPhase("mapping");
    } catch (reason) {
      if (!mounted.current) return;
      setPhase("idle");
      if (isCancellation(reason)) {
        setMessage("已取消表头读取；没有保留不完整文件。可重新选择 CSV。");
      } else {
        setError(getErrorMessage(reason, "无法解析 CSV 表头。请检查文件编码和引号。"));
      }
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const runPreflight = async () => {
    if (!file) return;
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
      preflightRunId.current += 1;
      setPlan(nextPlan);
      setSourceProgress(null);
      setPreflightProgress(null);
      setPhase("ready");
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
        setMessage("已取消预检；没有写入任何案例。可重新选择文件开始。 ");
      } else {
        setError(getErrorMessage(reason, "CSV 预检失败。请检查表头和文件编码。"));
      }
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const chooseFile = async () => {
    setError(null);
    try {
      const pickedFile = await pickFile({ accept: ".csv,text/csv,text/plain", maxBytes: MAX_CSV_BYTES });
      if (pickedFile) await resetForFile(pickedFile);
    } catch (reason) {
      setError(getErrorMessage(reason, "无法读取 CSV 文件。"));
    }
  };

  const updateMapping = (field: CaseImportField, columnIndex: string) => {
    preflightRunId.current += 1;
    setMapping((current) => ({ ...current, [field]: columnIndex === "" ? undefined : Number(columnIndex) }));
    setPlan(null);
    setSourceProgress(null);
    setPreflightProgress(null);
    setWriteResults(new Map());
    setSuccessfulRows(new Set());
    setMessage(null);
    setError(null);
    setPhase("mapping");
  };

  const cancelCurrentOperation = () => {
    abortController.current?.abort();
  };

  const busy = phase === "reading" || phase === "preflighting" || phase === "importing";
  const combinedPreflightPercent = Math.min(100, Math.max(0, preflightProgress
    ? 30 + preflightProgress.percent * 0.7
    : sourceProgress
      ? sourceProgress.percent * 0.3
      : 0));

  const importRows = async () => {
    if (!plan || pendingCandidates.length === 0) return;
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
          await caseRepository.createCandidateSet({
            alias: candidate.alias,
            tags: candidate.tags,
            notes: "",
            candidateSet,
            duplicateGuard: duplicatePolicy === "import_copy" ? "allow" : "reject"
          });
        } else {
          const chart = await calculateChart(candidate.input, rulePackContext.profile, calculationOptions);
          if (controller.signal.aborted) {
            cancelled = true;
            break;
          }
          await caseRepository.createCase({
            alias: candidate.alias,
            tags: candidate.tags,
            notes: "",
            calculated: chart,
            duplicateGuard: duplicatePolicy === "import_copy" ? "allow" : "reject"
          });
        }
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
        if (reason instanceof DuplicateBirthFingerprintError) concurrentDuplicateDetected = true;
        if (reason instanceof DuplicateBirthFingerprintError && duplicatePolicy === "skip") {
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
            message: reason instanceof DuplicateBirthFingerprintError
              ? "预检后检测到相同出生输入；本行已按标错策略拒绝写入。"
              : getErrorMessage(reason, "候选/排盘计算或案例写入失败。")
          });
        }
      }
      processed += 1;
      if (processed % 25 === 0 || processed === total) flushProgress();
    }

    if (!mounted.current) return;
    flushProgress();
    setPhase("ready");
    if (cancelled || controller.signal.aborted) {
      setMessage(`已在行边界停止：本轮成功 ${imported} 行、跳过重复 ${skipped} 行、失败 ${failed} 行；已提交的案例保留，剩余行可继续导入。`);
    } else {
      setMessage(`本轮完成：成功写入 ${imported} 行，提交时跳过重复 ${skipped} 行，失败 ${failed} 行。坏行不会阻塞其他记录，可下载完整报告复核。`);
    }
    if (abortController.current === controller) abortController.current = null;
    if ((imported > 0 || concurrentDuplicateDetected) && onImported) {
      try {
        await onImported();
      } catch (reason) {
        if (mounted.current) {
          setError(`数据已经写入，但页面列表刷新失败：${getErrorMessage(reason, "请手动刷新页面。")}`);
        }
      }
    }
  };

  const downloadTemplate = async () => {
    setError(null);
    const result = await saveTextFile(
      "hakimi-bazi-case-import-template.csv",
      `\ufeff${[csvLine(TEMPLATE_HEADERS), csvLine(TEMPLATE_EXAMPLE)].join("\r\n")}`,
      "text/csv;charset=utf-8"
    );
    const delivery = resolveFileDelivery(result, "CSV 模板导出");
    if (delivery.kind === "error") {
      setError(delivery.message);
      return;
    }
    setMessage(delivery.message);
  };

  const downloadReport = async () => {
    if (!plan) return;
    setError(null);
    const result = await saveTextFile(
      `hakimi-bazi-import-report-${new Date().toISOString().slice(0, 10)}.csv`,
      makeReport(plan, writeResults),
      "text/csv;charset=utf-8"
    );
    const delivery = resolveFileDelivery(result, "CSV 预检/导入报告导出");
    if (delivery.kind === "error") {
      setError(delivery.message);
      return;
    }
    setMessage(delivery.message);
  };

  return (
    <section className="case-import-panel" aria-labelledby="case-import-title">
      <div className="case-import-heading">
        <div>
          <p className="eyebrow">CSV batch intake</p>
          <h2 id="case-import-title">批量导入案例</h2>
          <p>读取 UTF-8 CSV 后先映射字段，再由后台线程分块预检并逐行写入；首版单文件上限 {MAX_CASE_IMPORT_ROWS.toLocaleString("zh-CN")} 行，单条逻辑记录上限 {MAX_CASE_IMPORT_RECORD_CHARACTERS.toLocaleString("zh-CN")} 个字符。错误行、超限行与重复行不会阻塞其他有效记录。</p>
        </div>
        <StatusPill tone="jade">精确盘 + 未知时辰候选组</StatusPill>
      </div>

      <div className="case-import-boundary">
        <AlertTriangle aria-hidden="true" />
        <p><strong>未知时辰仍然不会被补成某个出生时刻。</strong> `unknown_hour` 行会保存原始 <code>time=null</code>、13 个代表性探针和完整快照；它是可重开的候选组，不是已确定主盘。</p>
      </div>

      <div className="case-import-actions">
        <button type="button" className="secondary-action" onClick={() => void downloadTemplate()} disabled={busy}><FileDown aria-hidden="true" />下载 CSV 模板</button>
        <button type="button" className="primary-action" onClick={() => void chooseFile()} disabled={busy}><FileUp aria-hidden="true" />选择 CSV</button>
        {busy ? <button type="button" className="secondary-action" onClick={cancelCurrentOperation}><X aria-hidden="true" />{phase === "reading" ? "取消读取" : phase === "preflighting" ? "取消预检" : "停止导入"}</button> : null}
      </div>

      <details className="case-import-columns">
        <summary>查看模板列名与取值约定</summary>
        <p><code>{TEMPLATE_HEADERS.join(",")}</code></p>
        <p>标签用 <code>|</code> 分隔；时间精度用 <code>精确到分钟/exact_minute</code> 或 <code>未知时辰/unknown_hour</code>；时区必须是 IANA 名称，例如 <code>Asia/Shanghai</code>。</p>
      </details>

      {file ? <p className="case-import-file"><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB</span></p> : null}

      {phase === "reading" ? (
        <div className="case-import-progress" role="status" aria-live="polite">
          <div><strong>正在后台读取表头</strong><span>长表头与引号记录不会占用页面主线程</span></div>
          <progress aria-label="CSV 表头读取进度" />
        </div>
      ) : null}

      {file ? (
        <section className="case-import-mapping" aria-labelledby="case-import-mapping-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">Column mapping</p><h3 id="case-import-mapping-title">字段映射</h3></div>
            <StatusPill tone={hasRequiredMapping(mapping) ? "jade" : "warning"}>{hasRequiredMapping(mapping) ? "必填字段已齐" : "等待必填映射"}</StatusPill>
          </div>
          <p className="section-help">左侧是研究台字段，右侧选择此文件中的列。模板列会自动识别；重复列名仍按实际列序号区分。</p>
          <div className="case-import-mapping-grid">
            {MAPPING_FIELDS.map((field) => (
              <label key={field.key}>
                <span>{field.label}{field.required ? <em>必填</em> : null}</span>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => updateMapping(field.key, event.target.value)}
                  disabled={phase === "preflighting" || phase === "importing"}
                >
                  <option value="">不映射</option>
                  {headers.map((header, index) => <option key={`${index}-${header}`} value={index}>{index + 1} · {header || "（空表头）"}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="case-import-mapping-footer">
            <label className="field"><span>重复出生输入策略</span><select value={duplicatePolicy} disabled={phase === "preflighting" || phase === "importing"} onChange={(event) => { preflightRunId.current += 1; setDuplicatePolicy(event.target.value as DuplicatePolicy); setPlan(null); setSourceProgress(null); setPreflightProgress(null); setPhase("mapping"); }}><option value="skip">跳过重复（推荐）</option><option value="import_copy">作为副本导入</option><option value="error">标记为错误</option></select></label>
            <button type="button" className="primary-action" disabled={!hasRequiredMapping(mapping) || phase === "preflighting" || phase === "importing"} onClick={() => void runPreflight()}><FileUp aria-hidden="true" />按此映射预检</button>
          </div>
        </section>
      ) : null}

      {phase === "preflighting" ? (
        <div className="case-import-progress" role="status" aria-live="polite">
          <div><strong>正在预检</strong><span>{preflightProgress
            ? `${preflightProgress.processedRows} / ${preflightProgress.totalRows} 行`
            : sourceProgress
              ? `扫描 ${sourceProgress.processedUnits.toLocaleString("zh-CN")} / ${sourceProgress.totalUnits.toLocaleString("zh-CN")} ${sourceProgressUnitLabel(sourceProgress.unit)} · ${sourceProgress.parsedRecords} 条记录`
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

      {error ? <div className="inline-error" role="alert"><strong>CSV 操作未完成</strong><p>{error}</p></div> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      {plan ? (
        <div className="case-import-preview">
          <div className="case-import-stats" role="group" aria-label="CSV 预检统计">
            <div><strong>{plan.stats.totalRows}</strong><span>数据行</span></div>
            <div><strong>{writableCandidates.length - unknownHourCount}</strong><span>精确时间可写入</span></div>
            <div><strong>{unknownHourCount}</strong><span>未知时辰候选组</span></div>
            <div><strong>{plan.stats.invalidRows}</strong><span>格式错误</span></div>
            <div><strong>{plan.stats.skippedRows}</strong><span>重复跳过</span></div>
          </div>

          <div className="case-import-actions case-import-actions--commit">
            <button type="button" className="primary-action" disabled={pendingCandidates.length === 0 || phase !== "ready"} onClick={() => void importRows()}>
              {successfulRows.size > 0 || failedWrites.length > 0 ? <RotateCcw aria-hidden="true" /> : <FileUp aria-hidden="true" />}
              {pendingCandidates.length ? `${successfulRows.size > 0 || failedWrites.length > 0 ? "继续/重试" : "导入"} ${pendingCandidates.length} 条记录` : "没有待导入记录"}
            </button>
          <button type="button" className="secondary-action" onClick={() => void downloadReport()}><FileDown aria-hidden="true" />下载完整预检/导入报告</button>
          </div>

          {problemRows.length ? (
            <details className="case-import-problems" open={problemRows.length <= 12}>
              <summary>查看错误与重复行（{problemRows.length}）</summary>
              <div className="case-import-table-wrap">
                <table className="case-import-table">
                  <thead><tr><th>CSV 行</th><th>案例</th><th>状态</th><th>详情</th></tr></thead>
                  <tbody>
                    {problemRows.slice(0, ROW_PREVIEW_LIMIT).map((row) => {
                      const status = preflightRowStatus(row);
                      return <tr key={`${row.recordNumber}-${row.rowNumber}`}><td>{row.rowNumber}</td><td>{rowAlias(row) || "—"}</td><td><StatusPill tone={row.status === "invalid" ? "cinnabar" : "warning"}>{status.label}</StatusPill></td><td>{status.detail}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              {problemRows.length > ROW_PREVIEW_LIMIT ? <p className="muted-copy">界面只显示前 {ROW_PREVIEW_LIMIT} 行；下载完整报告可复核全部逐行错误。</p> : null}
            </details>
          ) : <p className="case-import-clean">格式预检没有发现错误或重复行；未知时辰会作为候选组正常写入。</p>}

          {failedWrites.length ? (
            <div className="case-import-write-errors" role="alert">
              <strong>{failedWrites.length} 行在排盘计算或写库时失败</strong>
              <ul>{failedWrites.slice(0, ROW_PREVIEW_LIMIT).map((result) => <li key={result.rowNumber}>第 {result.rowNumber} 行 · {result.alias}：{result.message}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
