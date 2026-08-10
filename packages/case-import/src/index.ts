import {
  BIRTH_FINGERPRINT_VERSION,
  birthInputSchema,
  buildBirthFingerprintPayload,
  SCHEMA_VERSION,
  type BirthInput
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";

export const CASE_IMPORT_FORMAT_VERSION = "hakimi-case-import-plan@0.1.0" as const;
export { BIRTH_FINGERPRINT_VERSION } from "@hakimi/contracts";
export const MAX_CASE_IMPORT_ROWS = 5_000;
export const MAX_CASE_IMPORT_COLUMNS = 256;
export const MAX_CASE_IMPORT_HEADER_CHARACTERS = 32_768;
export const MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS = 256;
/** Maximum UTF-16 code units retained for one logical data record. */
export const MAX_CASE_IMPORT_RECORD_CHARACTERS = 128 * 1_024;
export const DEFAULT_CSV_PARSE_CHARACTER_BUDGET = 32_768;
const MAX_RECORD_STREAM_WRITE_CHARACTERS = 1_024;

export type CsvSyntaxErrorCode =
  | "CSV_UNEXPECTED_QUOTE"
  | "CSV_CHARACTER_AFTER_QUOTE"
  | "CSV_UNCLOSED_QUOTE"
  | "CSV_RECORD_TOO_LARGE";

export type CaseImportConfigurationErrorCode =
  | "CSV_HEADER_REQUIRED"
  | "CSV_HEADER_SYNTAX_ERROR"
  | "CSV_HEADER_TOO_LARGE"
  | "CSV_TOO_MANY_COLUMNS"
  | "CSV_HEADER_CELL_TOO_LONG"
  | "CSV_INVALID_UTF8"
  | "CSV_SOURCE_TOTAL_INVALID"
  | "CSV_SOURCE_PROGRESS_INVALID"
  | "CSV_SOURCE_HEADER_MISMATCH"
  | "CSV_SOURCE_CHANGED_BETWEEN_PASSES"
  | "MISSING_REQUIRED_MAPPING"
  | "HEADER_NOT_FOUND"
  | "AMBIGUOUS_HEADER"
  | "COLUMN_INDEX_OUT_OF_RANGE"
  | "INVALID_CHUNK_SIZE"
  | "INVALID_PARSE_CHARACTER_BUDGET"
  | "INVALID_TAG_SEPARATOR"
  | "ROW_LIMIT_EXCEEDED";

export type CaseImportRowErrorCode =
  | CsvSyntaxErrorCode
  | "CSV_COLUMN_COUNT_MISMATCH"
  | "REQUIRED_VALUE_MISSING"
  | "ALIAS_REQUIRED"
  | "ALIAS_TOO_LONG"
  | "INVALID_CALENDAR_TYPE"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "UNSUPPORTED_TIME_PRECISION"
  | "EXACT_MINUTE_TIME_REQUIRED"
  | "UNKNOWN_HOUR_TIME_MUST_BE_EMPTY"
  | "INVALID_TIME_ZONE"
  | "INVALID_SEX"
  | "INVALID_BOOLEAN_VALUE"
  | "INVALID_NUMBER_VALUE"
  | "COORDINATE_PAIR_REQUIRED"
  | "INVALID_LATITUDE"
  | "INVALID_LONGITUDE"
  | "INVALID_LOCATION_PRECISION"
  | "LOCATION_PRECISION_MISMATCH"
  | "TOO_MANY_TAGS"
  | "TAG_EMPTY"
  | "TAG_TOO_LONG"
  | "SOURCE_NOTE_TOO_LONG"
  | "BIRTH_INPUT_INVALID"
  | "DUPLICATE_BIRTH_FINGERPRINT";

export type CaseImportField =
  | "alias"
  | "calendarType"
  | "date"
  | "time"
  | "timePrecision"
  | "timeZone"
  | "sex"
  | "lunarLeapMonth"
  | "locationLabel"
  | "latitude"
  | "longitude"
  | "locationPrecision"
  | "tags"
  | "sourceNote";

/** Numeric selectors are zero-based CSV column indexes. */
export type CsvColumnSelector = string | number;

export type CaseImportColumnMapping = {
  alias: CsvColumnSelector;
  date: CsvColumnSelector;
  timePrecision: CsvColumnSelector;
  timeZone: CsvColumnSelector;
  sex: CsvColumnSelector;
  calendarType?: CsvColumnSelector;
  time?: CsvColumnSelector;
  lunarLeapMonth?: CsvColumnSelector;
  locationLabel?: CsvColumnSelector;
  latitude?: CsvColumnSelector;
  longitude?: CsvColumnSelector;
  locationPrecision?: CsvColumnSelector;
  tags?: CsvColumnSelector;
  sourceNote?: CsvColumnSelector;
};

export type DuplicatePolicy = "skip" | "import_copy" | "error";

export type CaseImportOptions = {
  mapping: CaseImportColumnMapping;
  duplicatePolicy?: DuplicatePolicy;
  existingFingerprints?: Iterable<string>;
  tagSeparator?: string;
  chunkSize?: number;
  /** Maximum UTF-16 code units parsed before yielding control. */
  parseCharacterBudget?: number;
  signal?: AbortSignal;
  onProgress?: (progress: CaseImportProgress) => void | Promise<void>;
  onParseProgress?: (progress: CsvParseProgress) => void | Promise<void>;
  onSourceProgress?: (progress: CsvSourceProgress) => void | Promise<void>;
  /** Testability hook; the default yields a macrotask between parser and row budgets. */
  yieldControl?: () => Promise<void>;
};

export type CsvSyntaxIssue = {
  code: CsvSyntaxErrorCode;
  rowNumber: number;
  columnNumber: number;
  message: string;
};

export type ParsedCsvRecord = {
  /** One-based physical line on which this record begins. */
  rowNumber: number;
  cells: string[];
  issues: CsvSyntaxIssue[];
};

export type ParsedCsv = {
  records: ParsedCsvRecord[];
};

export type CsvParseProgress = {
  processedCharacters: number;
  totalCharacters: number;
  parsedRecords: number;
  percent: number;
};

export type CsvSourceUnit = "utf8_bytes" | "utf16_code_units";

export type DecodedCsvChunk = {
  text: string;
  /** Cumulative source units consumed after decoding this chunk. */
  processedUnits: number;
};

export type RepeatableDecodedCsvSource = {
  unit: CsvSourceUnit;
  totalUnits: number;
  /** Every call must return a fresh stream beginning at the source start. */
  open(signal?: AbortSignal): AsyncIterable<DecodedCsvChunk>;
};

export type CsvSourceProgress = {
  unit: CsvSourceUnit;
  processedUnits: number;
  totalUnits: number;
  parsedRecords: number;
  percent: number;
};

export type AsyncCsvParseOptions = {
  maxRecords?: number;
  /** Optional per-record UTF-16 code-unit limit; excess content is discarded after one stable row issue. */
  recordCharacterLimit?: number;
  signal?: AbortSignal;
  /** Maximum UTF-16 code units parsed before yielding a macrotask. */
  characterBudget?: number;
  onProgress?: (progress: CsvParseProgress) => void | Promise<void>;
  /** Testability hook; production callers should keep the macrotask default. */
  yieldControl?: () => Promise<void>;
};

export type AsyncCsvRecordIteratorOptions = AsyncCsvParseOptions & {
  /** Exact UTF-16 code-unit total for chunk iterables; inferred for strings. */
  totalCharacters?: number;
  /**
   * Diagnostic hook for proving the stream stays bounded. It observes only
   * completed records waiting to be yielded, never all records parsed so far.
   */
  onBufferedRecordCountChange?: (bufferedRecords: number) => void;
  /** Internal-compatible guard used by source readers for the first record. */
  firstRecordCharacterLimit?: number;
};

export type CsvSourceRecordIteratorOptions = Omit<
  AsyncCsvRecordIteratorOptions,
  "onProgress" | "totalCharacters"
> & {
  onProgress?: (progress: CsvSourceProgress) => void | Promise<void>;
};

export type IncrementalRfc4180CsvParser = {
  /** Adds one arbitrary source chunk while retaining quote/newline state. */
  write(chunk: string): void;
  /** Finalizes an optional unterminated last record. Idempotent. */
  finish(): ParsedCsv;
  readonly parsedRecordCount: number;
};

export type CaseImportConfigurationIssue = {
  code: CaseImportConfigurationErrorCode;
  field?: CaseImportField;
  selector?: CsvColumnSelector;
  message: string;
};

export class CaseImportConfigurationError extends Error {
  readonly code = "CASE_IMPORT_CONFIGURATION_INVALID" as const;

  constructor(readonly issues: CaseImportConfigurationIssue[]) {
    super(issues.map((issue) => issue.message).join("；"));
    this.name = "CaseImportConfigurationError";
  }
}

export class CaseImportCancelledError extends Error {
  readonly code = "IMPORT_CANCELLED" as const;

  constructor() {
    super("CSV 导入计划生成已取消");
    this.name = "CaseImportCancelledError";
  }
}

export type CaseImportRowError = {
  code: CaseImportRowErrorCode;
  field?: CaseImportField;
  message: string;
};

export type DuplicateSource = "existing_data" | "earlier_csv_row";

export type CaseImportCandidate = {
  rowNumber: number;
  recordNumber: number;
  alias: string;
  tags: string[];
  sourceNote: string;
  input: BirthInput;
  fingerprint: string;
  duplicate: null | {
    source: DuplicateSource;
    policy: DuplicatePolicy;
  };
};

export type CaseImportReadyRow = {
  status: "ready";
  rowNumber: number;
  recordNumber: number;
  candidate: CaseImportCandidate;
};

export type CaseImportSkippedRow = {
  status: "skipped_duplicate";
  rowNumber: number;
  recordNumber: number;
  fingerprint: string;
  duplicateSource: DuplicateSource;
};

export type CaseImportInvalidRow = {
  status: "invalid";
  rowNumber: number;
  recordNumber: number;
  errors: CaseImportRowError[];
  candidate?: CaseImportCandidate;
};

export type CaseImportRow = CaseImportReadyRow | CaseImportSkippedRow | CaseImportInvalidRow;

export type CaseImportStats = {
  totalRows: number;
  processedRows: number;
  importableRows: number;
  invalidRows: number;
  duplicateRows: number;
  skippedRows: number;
  ignoredBlankRows: number;
};

export type CaseImportProgress = CaseImportStats & {
  batchNumber: number;
  percent: number;
};

export type CaseImportBatch = {
  formatVersion: typeof CASE_IMPORT_FORMAT_VERSION;
  batchNumber: number;
  headers: string[];
  rows: CaseImportRow[];
  imports: CaseImportCandidate[];
  progress: CaseImportProgress;
};

export type CaseImportIterationSummary = {
  formatVersion: typeof CASE_IMPORT_FORMAT_VERSION;
  fingerprintVersion: typeof BIRTH_FINGERPRINT_VERSION;
  headers: string[];
  stats: CaseImportStats;
};

export type CaseImportPlan = CaseImportIterationSummary & {
  rows: CaseImportRow[];
  imports: CaseImportCandidate[];
  hasRowErrors: boolean;
  allowsPartialImport: true;
};

const REQUIRED_MAPPING_FIELDS = ["alias", "date", "timePrecision", "timeZone", "sex"] as const;

const ENUM_ALIASES = {
  calendarType: new Map<string, BirthInput["calendarType"]>([
    ["gregorian", "gregorian"],
    ["公历", "gregorian"],
    ["阳历", "gregorian"],
    ["lunar", "lunar"],
    ["农历", "lunar"],
    ["阴历", "lunar"]
  ]),
  timePrecision: new Map<string, "exact_minute" | "unknown_hour">([
    ["exact_minute", "exact_minute"],
    ["精确到分钟", "exact_minute"],
    ["精确", "exact_minute"],
    ["unknown_hour", "unknown_hour"],
    ["未知时辰", "unknown_hour"],
    ["时辰未知", "unknown_hour"]
  ]),
  sex: new Map<string, BirthInput["sex"]>([
    ["male", "male"],
    ["男", "male"],
    ["female", "female"],
    ["女", "female"],
    ["unspecified", "unspecified"],
    ["未指定", "unspecified"],
    ["未知", "unspecified"]
  ]),
  locationPrecision: new Map<string, BirthInput["location"]["precision"]>([
    ["coordinates", "coordinates"],
    ["坐标", "coordinates"],
    ["city", "city"],
    ["城市", "city"],
    ["unknown", "unknown"],
    ["未知", "unknown"]
  ])
} as const;

function isRecordBlank(record: ParsedCsvRecord): boolean {
  return record.cells.every((cell) => cell === "") && record.issues.length === 0;
}

class Rfc4180CsvParserState implements IncrementalRfc4180CsvParser {
  private readonly records: ParsedCsvRecord[] = [];
  private parsedRecords = 0;
  private firstRecordCharacters = 0;
  private recordCharacters = 0;
  private recordTooLarge = false;
  private cells: string[] = [];
  private field = "";
  private issues: CsvSyntaxIssue[] = [];
  private inQuotes = false;
  private afterClosingQuote = false;
  private physicalLine = 1;
  private recordStartLine = 1;
  private atSourceStart = true;
  private pendingCr = false;
  private pendingQuoteInQuotedField = false;
  private finished = false;

  constructor(
    private readonly maxRecords: number | undefined,
    private readonly retainRecords = true,
    private readonly onRecord?: (record: ParsedCsvRecord) => void,
    private readonly firstRecordCharacterLimit?: number,
    private readonly recordCharacterLimit?: number
  ) {}

  get parsedRecordCount(): number {
    return this.parsedRecords;
  }

  private addIssue(code: CsvSyntaxErrorCode, columnNumber: number, message: string): void {
    if (this.recordTooLarge) return;
    this.issues.push({ code, rowNumber: this.recordStartLine, columnNumber, message });
  }

  private countRecordCharacter(): void {
    if (this.parsedRecords === 0 && this.firstRecordCharacterLimit !== undefined) {
      if (this.firstRecordCharacters >= this.firstRecordCharacterLimit) {
        throwCaseImportHeaderTooLarge(this.firstRecordCharacterLimit);
      }
      this.firstRecordCharacters += 1;
    }
    if (this.recordCharacterLimit === undefined || this.recordTooLarge) return;
    if (this.recordCharacters >= this.recordCharacterLimit) {
      const columnNumber = this.cells.length + 1;
      this.recordTooLarge = true;
      this.cells = [];
      this.field = "";
      this.issues = [{
        code: "CSV_RECORD_TOO_LARGE",
        rowNumber: this.recordStartLine,
        columnNumber,
        message: `CSV 单条数据记录不能超过 ${this.recordCharacterLimit} 个 UTF-16 字符；该行内容已丢弃以保护浏览器内存`
      }];
      return;
    }
    this.recordCharacters += 1;
  }

  private appendField(value: string): void {
    if (!this.recordTooLarge) this.field += value;
  }

  private endField(): void {
    if (!this.recordTooLarge) this.cells.push(this.field);
    this.field = "";
    this.afterClosingQuote = false;
  }

  private pushRecord(): void {
    const record = { rowNumber: this.recordStartLine, cells: this.cells, issues: this.issues };
    this.parsedRecords += 1;
    if (this.maxRecords !== undefined && this.parsedRecords > this.maxRecords) {
      throw new CaseImportConfigurationError([{
        code: "ROW_LIMIT_EXCEEDED",
        message: `CSV 数据行不能超过 ${MAX_CASE_IMPORT_ROWS} 行（空行也计入浏览器安全上限）`
      }]);
    }
    if (this.retainRecords) this.records.push(record);
    this.onRecord?.(record);
  }

  private endRecord(): void {
    this.endField();
    this.pushRecord();
    this.cells = [];
    this.issues = [];
    this.recordCharacters = 0;
    this.recordTooLarge = false;
    this.recordStartLine = this.physicalLine + 1;
  }

  private consumeNewline(sequence: "\r" | "\n" | "\r\n"): void {
    if (this.inQuotes) {
      this.appendField(sequence);
      this.physicalLine += 1;
      return;
    }
    this.endRecord();
    this.physicalLine += 1;
    this.recordStartLine = this.physicalLine;
  }

  private closeQuotedField(): void {
    this.inQuotes = false;
    this.afterClosingQuote = true;
  }

  write(rawChunk: string): void {
    if (this.finished) throw new Error("RFC 4180 parser 已结束，不能继续写入。 ");
    let chunk = rawChunk;
    if (this.atSourceStart && chunk.length > 0) {
      this.atSourceStart = false;
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    }
    if (chunk.length === 0) return;

    let index = 0;
    if (this.pendingCr) {
      this.pendingCr = false;
      if (chunk[0] === "\n") {
        if (this.inQuotes) this.countRecordCharacter();
        this.consumeNewline("\r\n");
        index = 1;
      } else {
        this.consumeNewline("\r");
      }
    }
    if (this.pendingQuoteInQuotedField) {
      this.pendingQuoteInQuotedField = false;
      if (chunk[index] === '"') {
        this.countRecordCharacter();
        this.appendField('"');
        index += 1;
      } else {
        this.closeQuotedField();
      }
    }

    while (index < chunk.length) {
      const char = chunk[index];

      if (char === "\r") {
        if (this.inQuotes) this.countRecordCharacter();
        if (index + 1 >= chunk.length) {
          this.pendingCr = true;
          index += 1;
        } else if (chunk[index + 1] === "\n") {
          if (this.inQuotes) this.countRecordCharacter();
          this.consumeNewline("\r\n");
          index += 2;
        } else {
          this.consumeNewline("\r");
          index += 1;
        }
        continue;
      }
      if (char === "\n") {
        if (this.inQuotes) this.countRecordCharacter();
        this.consumeNewline("\n");
        index += 1;
        continue;
      }

      this.countRecordCharacter();

      if (this.inQuotes) {
        if (char === '"') {
          if (index + 1 >= chunk.length) {
            this.pendingQuoteInQuotedField = true;
            index += 1;
          } else if (chunk[index + 1] === '"') {
            this.countRecordCharacter();
            this.appendField('"');
            index += 2;
          } else {
            this.closeQuotedField();
            index += 1;
          }
        } else {
          this.appendField(char);
          index += 1;
        }
        continue;
      }

      if (this.afterClosingQuote) {
        if (char === ",") {
          this.endField();
        } else {
          this.addIssue("CSV_CHARACTER_AFTER_QUOTE", this.cells.length + 1, "闭合引号后只能出现逗号或换行");
          this.appendField(char);
          this.afterClosingQuote = false;
        }
        index += 1;
        continue;
      }

      if (char === ",") {
        this.endField();
      } else if (char === '"') {
        if (this.field.length === 0) {
          this.inQuotes = true;
        } else {
          this.addIssue("CSV_UNEXPECTED_QUOTE", this.cells.length + 1, "未加引号的字段中出现了引号");
          this.appendField(char);
        }
      } else {
        this.appendField(char);
      }
      index += 1;
    }
  }

  finish(): ParsedCsv {
    if (this.finished) return { records: this.records };
    if (this.pendingQuoteInQuotedField) {
      this.pendingQuoteInQuotedField = false;
      this.closeQuotedField();
    }
    if (this.pendingCr) {
      this.pendingCr = false;
      this.consumeNewline("\r");
    }
    if (this.inQuotes) {
      this.addIssue("CSV_UNCLOSED_QUOTE", this.cells.length + 1, "CSV 在引号字段闭合前结束");
    }
    if (
      this.field.length > 0
      || this.cells.length > 0
      || this.issues.length > 0
      || this.afterClosingQuote
      || this.inQuotes
    ) {
      this.endField();
      this.pushRecord();
    }
    this.finished = true;
    return { records: this.records };
  }
}

/** Creates an RFC 4180 parser whose quote and CRLF state survives arbitrary chunk boundaries. */
export function createRfc4180CsvIncrementalParser(
  options: { maxRecords?: number; recordCharacterLimit?: number } = {}
): IncrementalRfc4180CsvParser {
  if (
    options.recordCharacterLimit !== undefined
    && (!Number.isInteger(options.recordCharacterLimit) || options.recordCharacterLimit < 0)
  ) {
    throw new RangeError("recordCharacterLimit 必须是大于等于 0 的整数");
  }
  return new Rfc4180CsvParserState(
    options.maxRecords,
    true,
    undefined,
    undefined,
    options.recordCharacterLimit
  );
}

/**
 * Parse RFC 4180 records synchronously without interpreting cell contents.
 * This compatibility entry shares the exact state machine used by the
 * cancellable incremental parser.
 */
export function parseRfc4180Csv(
  source: string,
  options: { maxRecords?: number; recordCharacterLimit?: number } = {}
): ParsedCsv {
  const parser = createRfc4180CsvIncrementalParser(options);
  parser.write(source);
  return parser.finish();
}

function csvParseProgress(
  processedCharacters: number,
  totalCharacters: number,
  parsedRecords: number
): CsvParseProgress {
  return {
    processedCharacters,
    totalCharacters,
    parsedRecords,
    percent: totalCharacters === 0
      ? 100
      : Math.round((processedCharacters / totalCharacters) * 10_000) / 100
  };
}

/**
 * Parses one string in bounded character slices. The default macrotask yield
 * lets AbortSignal fire even while a single quoted record is very large.
 */
export async function parseRfc4180CsvAsync(
  source: string,
  options: AsyncCsvParseOptions = {}
): Promise<ParsedCsv> {
  const characterBudget = options.characterBudget ?? DEFAULT_CSV_PARSE_CHARACTER_BUDGET;
  if (!Number.isInteger(characterBudget) || characterBudget < 1) {
    throw new RangeError("characterBudget 必须是大于 0 的整数");
  }
  throwIfAborted(options.signal);
  const parser = createRfc4180CsvIncrementalParser({
    maxRecords: options.maxRecords,
    recordCharacterLimit: options.recordCharacterLimit
  });
  let offset = 0;
  while (offset < source.length) {
    throwIfAborted(options.signal);
    const end = Math.min(source.length, offset + characterBudget);
    parser.write(source.slice(offset, end));
    offset = end;
    throwIfAborted(options.signal);
    if (offset < source.length) {
      await options.onProgress?.(csvParseProgress(offset, source.length, parser.parsedRecordCount));
      throwIfAborted(options.signal);
      await (options.yieldControl ?? defaultYieldControl)();
      throwIfAborted(options.signal);
    }
  }
  const parsed = parser.finish();
  await options.onProgress?.(csvParseProgress(source.length, source.length, parsed.records.length));
  throwIfAborted(options.signal);
  return parsed;
}

/**
 * Streams complete RFC 4180 records from bounded character writes. The
 * underlying parser does not retain records after handing them to this
 * iterator; at most one write's completed records wait for the consumer.
 */
export async function* iterateRfc4180CsvRecords(
  source: string | Iterable<string> | AsyncIterable<string>,
  options: AsyncCsvRecordIteratorOptions = {}
): AsyncGenerator<ParsedCsvRecord, CsvParseProgress, void> {
  const characterBudget = options.characterBudget ?? DEFAULT_CSV_PARSE_CHARACTER_BUDGET;
  if (!Number.isInteger(characterBudget) || characterBudget < 1) {
    throw new RangeError("characterBudget 必须是大于 0 的整数");
  }
  if (
    options.firstRecordCharacterLimit !== undefined
    && (!Number.isInteger(options.firstRecordCharacterLimit) || options.firstRecordCharacterLimit < 0)
  ) {
    throw new RangeError("firstRecordCharacterLimit 必须是大于等于 0 的整数");
  }
  if (
    options.recordCharacterLimit !== undefined
    && (!Number.isInteger(options.recordCharacterLimit) || options.recordCharacterLimit < 0)
  ) {
    throw new RangeError("recordCharacterLimit 必须是大于等于 0 的整数");
  }
  throwIfAborted(options.signal);
  const sourceIsString = typeof source === "string";
  const knownTotalCharacters = sourceIsString ? source.length : options.totalCharacters;
  if (
    knownTotalCharacters !== undefined
    && (!Number.isInteger(knownTotalCharacters) || knownTotalCharacters < 0)
  ) {
    throw new RangeError("totalCharacters 必须是大于等于 0 的整数");
  }

  let bufferedRecords: ParsedCsvRecord[] = [];
  let bufferedOffset = 0;
  const notifyBufferSize = (): void => {
    options.onBufferedRecordCountChange?.(bufferedRecords.length - bufferedOffset);
  };
  const parser = new Rfc4180CsvParserState(
    options.maxRecords,
    false,
    (record) => {
      bufferedRecords.push(record);
      notifyBufferSize();
    },
    options.firstRecordCharacterLimit,
    options.recordCharacterLimit
  );
  let processedCharacters = 0;
  let charactersSinceControlYield = 0;

  const chunks = typeof source === "string" ? [source] : source;
  for await (const chunk of chunks) {
    let chunkOffset = 0;
    while (chunkOffset < chunk.length) {
      throwIfAborted(options.signal);
      const writeLength = Math.min(
        chunk.length - chunkOffset,
        characterBudget - charactersSinceControlYield,
        MAX_RECORD_STREAM_WRITE_CHARACTERS
      );
      const end = chunkOffset + writeLength;
      parser.write(chunk.slice(chunkOffset, end));
      chunkOffset = end;
      processedCharacters += writeLength;
      charactersSinceControlYield += writeLength;
      if (knownTotalCharacters !== undefined && processedCharacters > knownTotalCharacters) {
        throw new RangeError("totalCharacters 与字符块的实际长度不一致");
      }

      while (bufferedOffset < bufferedRecords.length) {
        throwIfAborted(options.signal);
        const record = bufferedRecords[bufferedOffset];
        bufferedOffset += 1;
        notifyBufferSize();
        yield record;
        throwIfAborted(options.signal);
      }
      if (bufferedOffset > 0) {
        bufferedRecords = [];
        bufferedOffset = 0;
      }

      if (charactersSinceControlYield < characterBudget) continue;
      if (
        sourceIsString
        && knownTotalCharacters !== undefined
        && processedCharacters >= knownTotalCharacters
      ) {
        charactersSinceControlYield = 0;
        continue;
      }
      if (knownTotalCharacters !== undefined) {
        await options.onProgress?.(csvParseProgress(
          processedCharacters,
          knownTotalCharacters,
          parser.parsedRecordCount
        ));
      }
      throwIfAborted(options.signal);
      await (options.yieldControl ?? defaultYieldControl)();
      throwIfAborted(options.signal);
      charactersSinceControlYield = 0;
    }
  }

  if (knownTotalCharacters !== undefined && processedCharacters !== knownTotalCharacters) {
    throw new RangeError("totalCharacters 与字符块的实际长度不一致");
  }

  parser.finish();
  while (bufferedOffset < bufferedRecords.length) {
    throwIfAborted(options.signal);
    const record = bufferedRecords[bufferedOffset];
    bufferedOffset += 1;
    notifyBufferSize();
    yield record;
    throwIfAborted(options.signal);
  }
  bufferedRecords = [];
  bufferedOffset = 0;

  const progress = csvParseProgress(processedCharacters, processedCharacters, parser.parsedRecordCount);
  await options.onProgress?.(progress);
  throwIfAborted(options.signal);
  return progress;
}

function throwSourceConfigurationIssue(
  code: Extract<
    CaseImportConfigurationErrorCode,
    "CSV_SOURCE_TOTAL_INVALID" | "CSV_SOURCE_PROGRESS_INVALID"
  >,
  message: string
): never {
  throw new CaseImportConfigurationError([{ code, message }]);
}

function validateRepeatableCsvSource(source: RepeatableDecodedCsvSource): void {
  if (source.unit !== "utf8_bytes" && source.unit !== "utf16_code_units") {
    throwSourceConfigurationIssue("CSV_SOURCE_PROGRESS_INVALID", "CSV Source 的进度单位无效");
  }
  if (!Number.isInteger(source.totalUnits) || source.totalUnits < 0) {
    throwSourceConfigurationIssue(
      "CSV_SOURCE_TOTAL_INVALID",
      "CSV Source 的 totalUnits 必须是大于等于 0 的整数"
    );
  }
}

function csvSourceProgress(
  source: RepeatableDecodedCsvSource,
  processedUnits: number,
  parsedRecords: number
): CsvSourceProgress {
  return {
    unit: source.unit,
    processedUnits,
    totalUnits: source.totalUnits,
    parsedRecords,
    percent: source.totalUnits === 0
      ? 100
      : Math.round((processedUnits / source.totalUnits) * 10_000) / 100
  };
}

/** Creates a repeatable UTF-16 source for compatibility and deterministic tests. */
export function createStringCsvSource(
  source: string,
  chunkCharacters = DEFAULT_CSV_PARSE_CHARACTER_BUDGET
): RepeatableDecodedCsvSource {
  if (!Number.isInteger(chunkCharacters) || chunkCharacters < 1) {
    throw new RangeError("chunkCharacters 必须是大于 0 的整数");
  }
  return {
    unit: "utf16_code_units",
    totalUnits: source.length,
    async *open(signal?: AbortSignal): AsyncGenerator<DecodedCsvChunk, void, void> {
      throwIfAborted(signal);
      let offset = 0;
      while (offset < source.length) {
        throwIfAborted(signal);
        const end = Math.min(source.length, offset + chunkCharacters);
        yield { text: source.slice(offset, end), processedUnits: end };
        throwIfAborted(signal);
        offset = end;
      }
    }
  };
}

/**
 * Opens one decoded source pass and yields RFC 4180 records without retaining
 * completed history. Source progress is cumulative in the source's declared
 * unit; the terminal 100% event is emitted only after parser finalization.
 */
export async function* iterateRfc4180CsvRecordsFromSource(
  source: RepeatableDecodedCsvSource,
  options: CsvSourceRecordIteratorOptions = {}
): AsyncGenerator<ParsedCsvRecord, CsvSourceProgress, void> {
  validateRepeatableCsvSource(source);
  throwIfAborted(options.signal);
  let processedUnits = 0;
  let decodedUtf16Characters = 0;
  let yieldedRecords = 0;
  let pendingProgressUnits: number | undefined;

  const reportPendingProgress = async (): Promise<void> => {
    if (pendingProgressUnits === undefined) return;
    const units = pendingProgressUnits;
    pendingProgressUnits = undefined;
    await options.onProgress?.(csvSourceProgress(source, units, yieldedRecords));
    throwIfAborted(options.signal);
  };

  const textChunks = async function* (): AsyncGenerator<string, void, void> {
    for await (const chunk of source.open(options.signal)) {
      throwIfAborted(options.signal);
      if (
        typeof chunk.text !== "string"
        || !Number.isInteger(chunk.processedUnits)
        || chunk.processedUnits < processedUnits
        || chunk.processedUnits > source.totalUnits
      ) {
        throwSourceConfigurationIssue(
          "CSV_SOURCE_PROGRESS_INVALID",
          "CSV Source 的 processedUnits 必须单调且不能超过 totalUnits"
        );
      }
      decodedUtf16Characters += chunk.text.length;
      if (source.unit === "utf16_code_units" && chunk.processedUnits !== decodedUtf16Characters) {
        throwSourceConfigurationIssue(
          "CSV_SOURCE_PROGRESS_INVALID",
          "UTF-16 Source 的 processedUnits 必须等于累计解码字符数"
        );
      }
      processedUnits = chunk.processedUnits;
      if (processedUnits < source.totalUnits) pendingProgressUnits = processedUnits;
      yield chunk.text;
      throwIfAborted(options.signal);
      await reportPendingProgress();
    }
    if (processedUnits !== source.totalUnits) {
      throwSourceConfigurationIssue(
        "CSV_SOURCE_PROGRESS_INVALID",
        "CSV Source 在结束时必须恰好处理 totalUnits"
      );
    }
  };

  const iterator = iterateRfc4180CsvRecords(textChunks(), {
    maxRecords: options.maxRecords,
    signal: options.signal,
    characterBudget: options.characterBudget,
    yieldControl: async () => {
      await reportPendingProgress();
      await (options.yieldControl ?? defaultYieldControl)();
    },
    onBufferedRecordCountChange: options.onBufferedRecordCountChange,
    firstRecordCharacterLimit: options.firstRecordCharacterLimit,
    recordCharacterLimit: options.recordCharacterLimit
  });
  let iteratorDone = false;
  try {
    while (true) {
      const result = await iterator.next();
      if (result.done) {
        iteratorDone = true;
        break;
      }
      yieldedRecords += 1;
      yield result.value;
      throwIfAborted(options.signal);
    }
  } finally {
    if (!iteratorDone) {
      await iterator.return(csvParseProgress(0, 0, yieldedRecords));
    }
  }

  const progress = csvSourceProgress(source, source.totalUnits, yieldedRecords);
  await options.onProgress?.(progress);
  throwIfAborted(options.signal);
  return progress;
}

function validateCaseImportHeaderCells(cells: readonly string[]): CaseImportConfigurationIssue[] {
  const issues: CaseImportConfigurationIssue[] = [];
  if (cells.length > MAX_CASE_IMPORT_COLUMNS) {
    issues.push({
      code: "CSV_TOO_MANY_COLUMNS",
      message: `CSV 表头不能超过 ${MAX_CASE_IMPORT_COLUMNS} 列`
    });
  }
  const oversizedCellIndex = cells.findIndex(
    (cell) => cell.length > MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS
  );
  if (oversizedCellIndex >= 0) {
    issues.push({
      code: "CSV_HEADER_CELL_TOO_LONG",
      selector: oversizedCellIndex,
      message: `CSV 第 ${oversizedCellIndex + 1} 个表头单元格不能超过 ${MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS} 个字符`
    });
  }
  return issues;
}

function throwCaseImportHeaderTooLarge(limit = MAX_CASE_IMPORT_HEADER_CHARACTERS): never {
  throw new CaseImportConfigurationError([{
    code: "CSV_HEADER_TOO_LARGE",
    message: `CSV 首条表头记录不能超过 ${limit} 个字符`
  }]);
}

function caseImportHeadersFromRecord(record: ParsedCsvRecord | undefined): string[] {
  const issues: CaseImportConfigurationIssue[] = [];
  if (!record || isRecordBlank(record)) {
    issues.push({ code: "CSV_HEADER_REQUIRED", message: "CSV 必须包含表头" });
  } else if (record.issues.length > 0) {
    issues.push({ code: "CSV_HEADER_SYNTAX_ERROR", message: "CSV 表头存在引号语法错误" });
  } else {
    issues.push(...validateCaseImportHeaderCells(record.cells));
  }
  if (issues.length > 0 || !record) throw new CaseImportConfigurationError(issues);
  return record.cells.map((cell) => cell.trim());
}

export async function readCaseImportHeadersFromSource(
  source: RepeatableDecodedCsvSource,
  options: Pick<
    CsvSourceRecordIteratorOptions,
    "signal" | "characterBudget" | "yieldControl" | "onProgress"
  > = {}
): Promise<string[]> {
  for await (const record of iterateRfc4180CsvRecordsFromSource(source, {
    ...options,
    firstRecordCharacterLimit: MAX_CASE_IMPORT_HEADER_CHARACTERS
  })) {
    return caseImportHeadersFromRecord(record);
  }
  return caseImportHeadersFromRecord(undefined);
}

/**
 * Reads only the first RFC 4180 record so a UI can ask the user to map columns
 * before running the full, chunked preflight. Quoted newlines in header cells
 * remain valid and do not terminate the scan early.
 */
export function readCaseImportHeaders(source: string): string[] {
  const input = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  let inQuotes = false;
  let atCellStart = true;
  let end = input.length;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (index >= MAX_CASE_IMPORT_HEADER_CHARACTERS) {
      if (!inQuotes && (char === "\r" || char === "\n")) {
        end = index;
        break;
      }
      throwCaseImportHeaderTooLarge();
    }
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          if (index + 1 >= MAX_CASE_IMPORT_HEADER_CHARACTERS) throwCaseImportHeaderTooLarge();
          index += 1;
        }
        else inQuotes = false;
      }
      continue;
    }
    if (char === '"' && atCellStart) {
      inQuotes = true;
      atCellStart = false;
      continue;
    }
    if (char === ",") {
      atCellStart = true;
      continue;
    }
    if (char === "\r" || char === "\n") {
      end = index;
      break;
    }
    atCellStart = false;
  }

  const parsed = parseRfc4180Csv(input.slice(0, end));
  const header = parsed.records[0];
  if (inQuotes && header) {
    return caseImportHeadersFromRecord({
      ...header,
      issues: [...header.issues, {
        code: "CSV_UNCLOSED_QUOTE",
        rowNumber: header.rowNumber,
        columnNumber: header.cells.length,
        message: "CSV 在引号字段闭合前结束"
      }]
    });
  }
  return caseImportHeadersFromRecord(header);
}

type ResolvedMapping = Partial<Record<CaseImportField, number>> &
  Record<(typeof REQUIRED_MAPPING_FIELDS)[number], number>;

type PreparedImport = {
  headers: string[];
  mapping: ResolvedMapping;
};

function validateCaseImportOptions(options: CaseImportOptions): void {
  const configurationIssues: CaseImportConfigurationIssue[] = [];
  if (!Number.isInteger(options.chunkSize ?? 100) || (options.chunkSize ?? 100) < 1) {
    configurationIssues.push({ code: "INVALID_CHUNK_SIZE", message: "chunkSize 必须是大于 0 的整数" });
  }
  if (
    !Number.isInteger(options.parseCharacterBudget ?? DEFAULT_CSV_PARSE_CHARACTER_BUDGET)
    || (options.parseCharacterBudget ?? DEFAULT_CSV_PARSE_CHARACTER_BUDGET) < 1
  ) {
    configurationIssues.push({
      code: "INVALID_PARSE_CHARACTER_BUDGET",
      message: "parseCharacterBudget 必须是大于 0 的整数"
    });
  }
  if ((options.tagSeparator ?? "|").length === 0) {
    configurationIssues.push({ code: "INVALID_TAG_SEPARATOR", field: "tags", message: "标签分隔符不能为空" });
  }
  if (configurationIssues.length > 0) throw new CaseImportConfigurationError(configurationIssues);
}

function prepareImportFromHeaders(headers: string[], options: CaseImportOptions): PreparedImport {
  const configurationIssues: CaseImportConfigurationIssue[] = [];
  const rawMapping = options.mapping as Partial<Record<CaseImportField, CsvColumnSelector>>;
  for (const field of REQUIRED_MAPPING_FIELDS) {
    if (rawMapping[field] === undefined) {
      configurationIssues.push({
        code: "MISSING_REQUIRED_MAPPING",
        field,
        message: `缺少必填字段映射：${field}`
      });
    }
  }

  const resolved: Partial<Record<CaseImportField, number>> = {};
  for (const [field, selector] of Object.entries(rawMapping) as Array<[CaseImportField, CsvColumnSelector | undefined]>) {
    if (selector === undefined) continue;
    if (typeof selector === "number") {
      if (!Number.isInteger(selector) || selector < 0 || selector >= headers.length) {
        configurationIssues.push({
          code: "COLUMN_INDEX_OUT_OF_RANGE",
          field,
          selector,
          message: `${field} 的列索引超出表头范围`
        });
      } else {
        resolved[field] = selector;
      }
      continue;
    }

    const matches = headers.flatMap((header, index) => (header === selector.trim() ? [index] : []));
    if (matches.length === 0) {
      configurationIssues.push({
        code: "HEADER_NOT_FOUND",
        field,
        selector,
        message: `${field} 找不到表头“${selector}”`
      });
    } else if (matches.length > 1) {
      configurationIssues.push({
        code: "AMBIGUOUS_HEADER",
        field,
        selector,
        message: `${field} 对应的表头“${selector}”不唯一，请改用零基列索引`
      });
    } else {
      resolved[field] = matches[0];
    }
  }

  if (configurationIssues.length > 0) throw new CaseImportConfigurationError(configurationIssues);

  return {
    headers,
    mapping: resolved as ResolvedMapping
  };
}

type CaseImportRecordCounts = {
  totalRows: number;
  ignoredBlankRows: number;
  parsedRecords: number;
};

type CaseImportSourceFirstPass = {
  prepared: PreparedImport;
  headerRecord: ParsedCsvRecord;
  counts: CaseImportRecordCounts;
};

function sameParsedHeader(left: ParsedCsvRecord, right: ParsedCsvRecord): boolean {
  return JSON.stringify({ cells: left.cells, issues: left.issues })
    === JSON.stringify({ cells: right.cells, issues: right.issues });
}

async function reportSourceProgress(
  options: CaseImportOptions,
  progress: CsvSourceProgress
): Promise<void> {
  await options.onSourceProgress?.(progress);
  throwIfAborted(options.signal);
  if (progress.unit === "utf16_code_units") {
    await options.onParseProgress?.({
      processedCharacters: progress.processedUnits,
      totalCharacters: progress.totalUnits,
      parsedRecords: progress.parsedRecords,
      percent: progress.percent
    });
  }
}

/** First pass: validate/map the header and establish exact row denominators. */
async function scanCaseImportSource(
  source: RepeatableDecodedCsvSource,
  options: CaseImportOptions
): Promise<CaseImportSourceFirstPass> {
  let recordNumber = 0;
  let totalRows = 0;
  let ignoredBlankRows = 0;
  let headerRecord: ParsedCsvRecord | undefined;
  let prepared: PreparedImport | undefined;
  for await (const record of iterateRfc4180CsvRecordsFromSource(source, {
    maxRecords: MAX_CASE_IMPORT_ROWS + 1,
    signal: options.signal,
    characterBudget: options.parseCharacterBudget,
    onProgress: (progress) => reportSourceProgress(options, progress),
    yieldControl: options.yieldControl,
    firstRecordCharacterLimit: MAX_CASE_IMPORT_HEADER_CHARACTERS,
    recordCharacterLimit: MAX_CASE_IMPORT_RECORD_CHARACTERS
  })) {
    recordNumber += 1;
    if (recordNumber === 1) {
      headerRecord = record;
      prepared = prepareImportFromHeaders(caseImportHeadersFromRecord(record), options);
      continue;
    }
    if (isRecordBlank(record)) ignoredBlankRows += 1;
    else totalRows += 1;
  }
  if (!headerRecord || !prepared) {
    throw new CaseImportConfigurationError([{
      code: "CSV_HEADER_REQUIRED",
      message: "CSV 必须包含表头"
    }]);
  }
  return {
    prepared,
    headerRecord,
    counts: { totalRows, ignoredBlankRows, parsedRecords: recordNumber }
  };
}

function addRowError(errors: CaseImportRowError[], error: CaseImportRowError): void {
  if (!errors.some((existing) => existing.code === error.code && existing.field === error.field)) errors.push(error);
}

function normalizedEnum<T>(map: ReadonlyMap<string, T>, raw: string): T | null {
  return map.get(raw.trim()) ?? null;
}

function parseBoolean(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (["true", "1", "yes", "是", "闰月"].includes(value)) return true;
  if (["false", "0", "no", "否", "非闰月"].includes(value)) return false;
  return null;
}

function parseDecimal(raw: string): number | null {
  const value = raw.trim();
  if (!/^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function schemaIssueToRowError(path: PropertyKey[]): CaseImportRowError {
  const root = String(path[0] ?? "");
  const nested = String(path[1] ?? "");
  if (root === "date") return { code: "INVALID_DATE", field: "date", message: "出生日期无效" };
  if (root === "time") return { code: "INVALID_TIME", field: "time", message: "出生时间无效" };
  if (root === "timePrecision") {
    return { code: "UNSUPPORTED_TIME_PRECISION", field: "timePrecision", message: "仅支持精确到分钟或未知时辰" };
  }
  if (root === "timeZone") return { code: "INVALID_TIME_ZONE", field: "timeZone", message: "IANA 时区无效" };
  if (root === "sex") return { code: "INVALID_SEX", field: "sex", message: "性别值无效" };
  if (root === "calendarType") {
    return { code: "INVALID_CALENDAR_TYPE", field: "calendarType", message: "历法值无效" };
  }
  if (root === "lunarLeapMonth") {
    return { code: "INVALID_BOOLEAN_VALUE", field: "lunarLeapMonth", message: "闰月标记无效" };
  }
  if (root === "sourceNote") {
    return { code: "SOURCE_NOTE_TOO_LONG", field: "sourceNote", message: "来源备注不能超过 500 字符" };
  }
  if (root === "location" && nested === "latitude") {
    return { code: "INVALID_LATITUDE", field: "latitude", message: "纬度必须位于 -90 到 90" };
  }
  if (root === "location" && nested === "longitude") {
    return { code: "INVALID_LONGITUDE", field: "longitude", message: "经度必须位于 -180 到 180" };
  }
  if (root === "location" && nested === "precision") {
    return { code: "INVALID_LOCATION_PRECISION", field: "locationPrecision", message: "地点精度无效" };
  }
  return { code: "BIRTH_INPUT_INVALID", message: "出生输入未通过契约校验" };
}

/** Alias, tags, sourceNote and the display-only location label never enter this fingerprint. */
export async function createBirthFingerprint(input: BirthInput): Promise<string> {
  const parsed = birthInputSchema.parse(input);
  return `${BIRTH_FINGERPRINT_VERSION}:${await sha256Hex(buildBirthFingerprintPayload(parsed))}`;
}

type ParseRecordResult =
  | { valid: false; row: CaseImportInvalidRow }
  | { valid: true; candidate: Omit<CaseImportCandidate, "fingerprint" | "duplicate"> };

function parseImportRecord(
  record: ParsedCsvRecord & { recordNumber: number },
  headers: string[],
  mapping: ResolvedMapping,
  tagSeparator: string
): ParseRecordResult {
  const errors: CaseImportRowError[] = record.issues.map((issue) => ({
    code: issue.code,
    message: issue.message
  }));
  if (errors.some((error) => error.code === "CSV_RECORD_TOO_LARGE")) {
    return {
      valid: false,
      row: {
        status: "invalid",
        rowNumber: record.rowNumber,
        recordNumber: record.recordNumber,
        errors
      }
    };
  }
  if (record.cells.length !== headers.length) {
    addRowError(errors, {
      code: "CSV_COLUMN_COUNT_MISMATCH",
      message: `本行有 ${record.cells.length} 列，表头有 ${headers.length} 列`
    });
  }

  const cell = (field: CaseImportField): string => {
    const index = mapping[field];
    return index === undefined ? "" : (record.cells[index] ?? "");
  };
  for (const field of REQUIRED_MAPPING_FIELDS) {
    if (cell(field).trim() === "") {
      addRowError(errors, { code: "REQUIRED_VALUE_MISSING", field, message: `${field} 不能为空` });
    }
  }

  const alias = cell("alias").trim();
  if (alias.length === 0) addRowError(errors, { code: "ALIAS_REQUIRED", field: "alias", message: "案例别名不能为空" });
  if (alias.length > 80) addRowError(errors, { code: "ALIAS_TOO_LONG", field: "alias", message: "案例别名不能超过 80 字符" });

  const calendarRaw = mapping.calendarType === undefined ? "gregorian" : cell("calendarType");
  const calendarType = normalizedEnum(ENUM_ALIASES.calendarType, calendarRaw);
  if (calendarType === null) {
    addRowError(errors, { code: "INVALID_CALENDAR_TYPE", field: "calendarType", message: "历法仅支持公历或农历" });
  }

  const precisionRaw = cell("timePrecision");
  const timePrecision = normalizedEnum(ENUM_ALIASES.timePrecision, precisionRaw);
  if (timePrecision === null) {
    addRowError(errors, {
      code: "UNSUPPORTED_TIME_PRECISION",
      field: "timePrecision",
      message: "首批导入仅支持 exact_minute/精确到分钟 与 unknown_hour/未知时辰"
    });
  }

  const rawTime = cell("time").trim();
  if (timePrecision === "exact_minute" && rawTime === "") {
    addRowError(errors, { code: "EXACT_MINUTE_TIME_REQUIRED", field: "time", message: "精确到分钟的记录必须填写时间" });
  }
  if (timePrecision === "unknown_hour" && rawTime !== "") {
    addRowError(errors, {
      code: "UNKNOWN_HOUR_TIME_MUST_BE_EMPTY",
      field: "time",
      message: "未知时辰必须保持空时间，导入器不会合成代表时间"
    });
  }
  const time = timePrecision === "unknown_hour" ? null : (rawTime || null);

  const sex = normalizedEnum(ENUM_ALIASES.sex, cell("sex"));
  if (sex === null) addRowError(errors, { code: "INVALID_SEX", field: "sex", message: "性别仅支持男、女或未指定" });

  let lunarLeapMonth = false;
  if (mapping.lunarLeapMonth !== undefined && cell("lunarLeapMonth").trim() !== "") {
    const parsedBoolean = parseBoolean(cell("lunarLeapMonth"));
    if (parsedBoolean === null) {
      addRowError(errors, {
        code: "INVALID_BOOLEAN_VALUE",
        field: "lunarLeapMonth",
        message: "闰月标记必须是 true/false、1/0 或 是/否"
      });
    } else {
      lunarLeapMonth = parsedBoolean;
    }
  }

  const rawLatitude = cell("latitude").trim();
  const rawLongitude = cell("longitude").trim();
  let latitude: number | null = null;
  let longitude: number | null = null;
  if ((rawLatitude === "") !== (rawLongitude === "")) {
    addRowError(errors, {
      code: "COORDINATE_PAIR_REQUIRED",
      field: rawLatitude === "" ? "latitude" : "longitude",
      message: "纬度和经度必须同时提供；导入器不会猜测缺失坐标"
    });
  }
  if (rawLatitude !== "") {
    latitude = parseDecimal(rawLatitude);
    if (latitude === null) {
      addRowError(errors, { code: "INVALID_NUMBER_VALUE", field: "latitude", message: "纬度必须是十进制数字" });
    }
  }
  if (rawLongitude !== "") {
    longitude = parseDecimal(rawLongitude);
    if (longitude === null) {
      addRowError(errors, { code: "INVALID_NUMBER_VALUE", field: "longitude", message: "经度必须是十进制数字" });
    }
  }

  const locationLabel = cell("locationLabel").trim();
  const derivedLocationPrecision: BirthInput["location"]["precision"] =
    latitude !== null && longitude !== null ? "coordinates" : locationLabel ? "city" : "unknown";
  let locationPrecision = derivedLocationPrecision;
  if (mapping.locationPrecision !== undefined && cell("locationPrecision").trim() !== "") {
    const parsedPrecision = normalizedEnum(ENUM_ALIASES.locationPrecision, cell("locationPrecision"));
    if (parsedPrecision === null) {
      addRowError(errors, {
        code: "INVALID_LOCATION_PRECISION",
        field: "locationPrecision",
        message: "地点精度仅支持 coordinates/city/unknown"
      });
    } else {
      locationPrecision = parsedPrecision;
      if (parsedPrecision !== derivedLocationPrecision) {
        addRowError(errors, {
          code: "LOCATION_PRECISION_MISMATCH",
          field: "locationPrecision",
          message: `地点精度 ${parsedPrecision} 与本行的显式坐标/地点信息不一致`
        });
      }
    }
  }

  const tags = cell("tags").trim() === ""
    ? []
    : cell("tags").split(tagSeparator).map((tag) => tag.trim());
  if (tags.length > 20) addRowError(errors, { code: "TOO_MANY_TAGS", field: "tags", message: "标签不能超过 20 个" });
  if (tags.some((tag) => tag.length === 0)) addRowError(errors, { code: "TAG_EMPTY", field: "tags", message: "标签不能为空" });
  if (tags.some((tag) => tag.length > 30)) addRowError(errors, { code: "TAG_TOO_LONG", field: "tags", message: "单个标签不能超过 30 字符" });

  const sourceNote = cell("sourceNote").trim();
  if (sourceNote.length > 500) {
    addRowError(errors, { code: "SOURCE_NOTE_TOO_LONG", field: "sourceNote", message: "来源备注不能超过 500 字符" });
  }

  const draft = {
    schemaVersion: SCHEMA_VERSION,
    calendarType: calendarType ?? calendarRaw.trim(),
    date: cell("date").trim(),
    time,
    timePrecision: timePrecision ?? precisionRaw.trim(),
    timeZone: cell("timeZone").trim(),
    sex: sex ?? cell("sex").trim(),
    lunarLeapMonth,
    location: {
      label: locationLabel,
      latitude,
      longitude,
      precision: locationPrecision
    },
    sourceNote
  };
  const parsedBirthInput = birthInputSchema.safeParse(draft);
  if (!parsedBirthInput.success) {
    for (const issue of parsedBirthInput.error.issues) addRowError(errors, schemaIssueToRowError(issue.path));
  }

  if (errors.length > 0 || !parsedBirthInput.success) {
    return {
      valid: false,
      row: {
        status: "invalid",
        rowNumber: record.rowNumber,
        recordNumber: record.recordNumber,
        errors
      }
    };
  }

  return {
    valid: true,
    candidate: {
      rowNumber: record.rowNumber,
      recordNumber: record.recordNumber,
      alias,
      tags,
      sourceNote,
      input: parsedBirthInput.data
    }
  };
}

function initialStats(totalRows: number, ignoredBlankRows: number): CaseImportStats {
  return {
    totalRows,
    processedRows: 0,
    importableRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    skippedRows: 0,
    ignoredBlankRows
  };
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new CaseImportCancelledError();
}

async function defaultYieldControl(): Promise<void> {
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
}

function throwCaseImportSourceHeaderMismatch(): never {
  throw new CaseImportConfigurationError([{
    code: "CSV_SOURCE_HEADER_MISMATCH",
    message: "CSV Source 两次打开得到的表头不一致"
  }]);
}

function throwCaseImportSourceChanged(): never {
  throw new CaseImportConfigurationError([{
    code: "CSV_SOURCE_CHANGED_BETWEEN_PASSES",
    message: "CSV Source 两次打开得到的记录数量或空行结构不一致"
  }]);
}

export async function* iterateCaseImportFromSource(
  source: RepeatableDecodedCsvSource,
  options: CaseImportOptions
): AsyncGenerator<CaseImportBatch, CaseImportIterationSummary, void> {
  throwIfAborted(options.signal);
  validateCaseImportOptions(options);
  validateRepeatableCsvSource(source);
  const firstPass = await scanCaseImportSource(source, options);
  const { prepared, counts, headerRecord } = firstPass;
  throwIfAborted(options.signal);
  const duplicatePolicy = options.duplicatePolicy ?? "skip";
  const existing = new Set(options.existingFingerprints ?? []);
  const seenInCsv = new Set<string>();
  const chunkSize = options.chunkSize ?? 100;
  const tagSeparator = options.tagSeparator ?? "|";
  const stats = initialStats(counts.totalRows, counts.ignoredBlankRows);
  let batchNumber = 0;
  let recordNumber = 0;
  let rows: CaseImportRow[] = [];
  let imports: CaseImportCandidate[] = [];

  const completeBatch = async (): Promise<CaseImportBatch> => {
    throwIfAborted(options.signal);
    batchNumber += 1;
    const progress: CaseImportProgress = {
      ...stats,
      batchNumber,
      percent: stats.totalRows === 0 ? 100 : Math.round((stats.processedRows / stats.totalRows) * 10_000) / 100
    };
    await options.onProgress?.(progress);
    throwIfAborted(options.signal);
    const batch: CaseImportBatch = {
      formatVersion: CASE_IMPORT_FORMAT_VERSION,
      batchNumber,
      headers: [...prepared.headers],
      rows,
      imports,
      progress
    };
    rows = [];
    imports = [];
    return batch;
  };

  let secondHeaderSeen = false;
  try {
    for await (const record of iterateRfc4180CsvRecordsFromSource(source, {
      maxRecords: MAX_CASE_IMPORT_ROWS + 1,
      signal: options.signal,
      characterBudget: options.parseCharacterBudget,
      yieldControl: options.yieldControl,
      firstRecordCharacterLimit: MAX_CASE_IMPORT_HEADER_CHARACTERS,
      recordCharacterLimit: MAX_CASE_IMPORT_RECORD_CHARACTERS
    })) {
      recordNumber += 1;
      if (recordNumber === 1) {
        secondHeaderSeen = true;
        if (!sameParsedHeader(headerRecord, record)) throwCaseImportSourceHeaderMismatch();
        continue;
      }
      if (isRecordBlank(record)) continue;

      throwIfAborted(options.signal);
      const numberedRecord = { ...record, recordNumber };
      const parsed = parseImportRecord(numberedRecord, prepared.headers, prepared.mapping, tagSeparator);
      stats.processedRows += 1;
      if (!parsed.valid) {
        rows.push(parsed.row);
        stats.invalidRows += 1;
      } else {
        const fingerprint = await createBirthFingerprint(parsed.candidate.input);
        throwIfAborted(options.signal);
        const duplicateSource: DuplicateSource | null = existing.has(fingerprint)
          ? "existing_data"
          : seenInCsv.has(fingerprint)
            ? "earlier_csv_row"
            : null;
        const candidate: CaseImportCandidate = {
          ...parsed.candidate,
          fingerprint,
          duplicate: duplicateSource ? { source: duplicateSource, policy: duplicatePolicy } : null
        };

        if (duplicateSource !== null) stats.duplicateRows += 1;
        if (duplicateSource !== null && duplicatePolicy === "skip") {
          stats.skippedRows += 1;
          rows.push({
            status: "skipped_duplicate",
            rowNumber: record.rowNumber,
            recordNumber,
            fingerprint,
            duplicateSource
          });
        } else if (duplicateSource !== null && duplicatePolicy === "error") {
          stats.invalidRows += 1;
          rows.push({
            status: "invalid",
            rowNumber: record.rowNumber,
            recordNumber,
            candidate,
            errors: [{
              code: "DUPLICATE_BIRTH_FINGERPRINT",
              message: duplicateSource === "existing_data" ? "与已有案例出生输入重复" : "与 CSV 中较早的记录重复"
            }]
          });
        } else {
          seenInCsv.add(fingerprint);
          stats.importableRows += 1;
          rows.push({
            status: "ready",
            rowNumber: record.rowNumber,
            recordNumber,
            candidate
          });
          imports.push(candidate);
        }
      }

      if (rows.length >= chunkSize) {
        yield await completeBatch();
        if (stats.processedRows < stats.totalRows) {
          await (options.yieldControl ?? defaultYieldControl)();
        }
      }
    }
  } catch (error) {
    if (
      !secondHeaderSeen
      && error instanceof CaseImportConfigurationError
      && error.issues.some((issue) => [
        "CSV_HEADER_REQUIRED",
        "CSV_HEADER_SYNTAX_ERROR",
        "CSV_HEADER_TOO_LARGE",
        "CSV_TOO_MANY_COLUMNS",
        "CSV_HEADER_CELL_TOO_LONG"
      ].includes(issue.code))
    ) {
      throwCaseImportSourceHeaderMismatch();
    }
    throw error;
  }

  if (!secondHeaderSeen) throwCaseImportSourceHeaderMismatch();
  if (recordNumber !== counts.parsedRecords || stats.processedRows !== counts.totalRows) {
    throwCaseImportSourceChanged();
  }

  if (rows.length > 0) yield await completeBatch();

  const summary: CaseImportIterationSummary = {
    formatVersion: CASE_IMPORT_FORMAT_VERSION,
    fingerprintVersion: BIRTH_FINGERPRINT_VERSION,
    headers: [...prepared.headers],
    stats: { ...stats }
  };
  if (counts.totalRows === 0) {
    const progress: CaseImportProgress = { ...stats, batchNumber: 0, percent: 100 };
    await options.onProgress?.(progress);
    throwIfAborted(options.signal);
  }
  return summary;
}

export async function* iterateCaseImport(
  csv: string,
  options: CaseImportOptions
): AsyncGenerator<CaseImportBatch, CaseImportIterationSummary, void> {
  validateCaseImportOptions(options);
  const source = createStringCsvSource(
    csv,
    options.parseCharacterBudget ?? DEFAULT_CSV_PARSE_CHARACTER_BUDGET
  );
  return yield* iterateCaseImportFromSource(source, options);
}

async function collectCaseImportPlan(
  iterator: AsyncGenerator<CaseImportBatch, CaseImportIterationSummary, void>
): Promise<CaseImportPlan> {
  const rows: CaseImportRow[] = [];
  const imports: CaseImportCandidate[] = [];
  let summary: CaseImportIterationSummary | undefined;

  while (true) {
    const result = await iterator.next();
    if (result.done) {
      summary = result.value;
      break;
    }
    rows.push(...result.value.rows);
    imports.push(...result.value.imports);
  }

  return {
    ...summary,
    rows,
    imports,
    hasRowErrors: summary.stats.invalidRows > 0,
    allowsPartialImport: true
  };
}

export async function buildCaseImportPlanFromSource(
  source: RepeatableDecodedCsvSource,
  options: CaseImportOptions
): Promise<CaseImportPlan> {
  return collectCaseImportPlan(iterateCaseImportFromSource(source, options));
}

export async function buildCaseImportPlan(csv: string, options: CaseImportOptions): Promise<CaseImportPlan> {
  return collectCaseImportPlan(iterateCaseImport(csv, options));
}
