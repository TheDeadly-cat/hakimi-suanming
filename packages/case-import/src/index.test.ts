import { describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import {
  BIRTH_FINGERPRINT_VERSION,
  CaseImportCancelledError,
  CaseImportConfigurationError,
  buildCaseImportPlan,
  buildCaseImportPlanFromSource,
  createRfc4180CsvIncrementalParser,
  createBirthFingerprint,
  createStringCsvSource,
  iterateCaseImport,
  iterateCaseImportFromSource,
  iterateRfc4180CsvRecords,
  iterateRfc4180CsvRecordsFromSource,
  MAX_CASE_IMPORT_COLUMNS,
  MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS,
  MAX_CASE_IMPORT_HEADER_CHARACTERS,
  MAX_CASE_IMPORT_RECORD_CHARACTERS,
  MAX_CASE_IMPORT_ROWS,
  parseRfc4180Csv,
  parseRfc4180CsvAsync,
  readCaseImportHeaders,
  readCaseImportHeadersFromSource,
  type CaseImportColumnMapping,
  type CsvParseProgress,
  type CsvSourceProgress,
  type RepeatableDecodedCsvSource
} from "./index";

const headers = [
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
];

const mapping: CaseImportColumnMapping = {
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

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvRow(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}

function csvWith(rows: string[][]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\r\n");
}

function exactRow(overrides: Partial<Record<(typeof headers)[number], string>> = {}): string[] {
  const values: Record<(typeof headers)[number], string> = {
    案例名: "研究案例",
    历法: "公历",
    出生日期: "1995-08-18",
    出生时间: "14:30",
    时间精度: "精确到分钟",
    IANA时区: "Asia/Shanghai",
    性别: "男",
    闰月: "否",
    地点: "上海",
    纬度: "31.2304",
    经度: "121.4737",
    地点精度: "坐标",
    标签: "亲友|已校验",
    来源备注: "口述记录",
    ...overrides
  };
  return headers.map((header) => values[header]);
}

describe("parseRfc4180Csv", () => {
  it("parses UTF-8 BOM, Chinese text, quoted commas, escaped quotes and embedded CRLF", () => {
    const csv = `\ufeff姓名,备注\r\n"张,三","第一行\r\n第二行 ""原话"""`;
    const parsed = parseRfc4180Csv(csv);

    expect(parsed.records).toHaveLength(2);
    expect(parsed.records[0].cells).toEqual(["姓名", "备注"]);
    expect(parsed.records[1]).toMatchObject({
      rowNumber: 2,
      cells: ["张,三", "第一行\r\n第二行 \"原话\""],
      issues: []
    });
  });

  it("reports stable quote syntax codes while recovering at a following row", () => {
    const parsed = parseRfc4180Csv("a,b\r\n坏\"值,x\r\n好值,y");
    expect(parsed.records[1].issues[0].code).toBe("CSV_UNEXPECTED_QUOTE");
    expect(parsed.records[2].cells).toEqual(["好值", "y"]);
  });

  it("reads only the mapping header while preserving quoted commas and newlines", () => {
    const source = `\ufeff"案例,名称","出生\n日期",时区\r\n${"x".repeat(2_000_000)}`;
    expect(readCaseImportHeaders(source)).toEqual(["案例,名称", "出生\n日期", "时区"]);
    expect(() => readCaseImportHeaders('"未闭合,日期\n内容')).toThrowError(CaseImportConfigurationError);
  });

  it.each([
    [
      "an oversized first record",
      "表".repeat(MAX_CASE_IMPORT_HEADER_CHARACTERS + 1),
      "CSV_HEADER_TOO_LARGE"
    ],
    [
      "too many columns",
      Array.from({ length: MAX_CASE_IMPORT_COLUMNS + 1 }, (_, index) => `列${index}`).join(","),
      "CSV_TOO_MANY_COLUMNS"
    ],
    [
      "an oversized header cell",
      `正常,${"长".repeat(MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS + 1)}`,
      "CSV_HEADER_CELL_TOO_LONG"
    ]
  ] as const)("rejects %s with a stable code in header reads and full preflight", async (_name, unsafeHeader, code) => {
    let directError: unknown;
    try {
      readCaseImportHeaders(`${unsafeHeader}\r\n数据`);
    } catch (error) {
      directError = error;
    }
    expect(directError).toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code })]
    });

    await expect(buildCaseImportPlan(`${unsafeHeader}\r\n数据`, { mapping })).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code })]
    });
  });

  it("accepts exact total-character, column-count and cell-length boundaries", () => {
    const exactTotalHeader = [
      ...Array.from({ length: 127 }, () => "甲".repeat(MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS)),
      "乙".repeat(129)
    ].join(",");
    expect(exactTotalHeader).toHaveLength(MAX_CASE_IMPORT_HEADER_CHARACTERS);
    const exactTotalCells = readCaseImportHeaders(`${exactTotalHeader}\r\n数据`);
    expect(exactTotalCells).toHaveLength(128);
    expect(exactTotalCells[0]).toHaveLength(MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS);

    const exactColumnHeader = Array.from(
      { length: MAX_CASE_IMPORT_COLUMNS },
      (_, index) => `列${index}`
    ).join(",");
    expect(readCaseImportHeaders(`${exactColumnHeader}\n数据`)).toHaveLength(MAX_CASE_IMPORT_COLUMNS);
  });

  it("counts both characters of same-chunk escaped quotes at the streamed header limit", async () => {
    const escapedCell = escapeCsvCell(`${"甲".repeat(252)}"乙`);
    expect(escapedCell).toHaveLength(257);
    const exactHeader = [
      escapedCell,
      ...Array.from({ length: 126 }, () => "甲".repeat(MAX_CASE_IMPORT_HEADER_CELL_CHARACTERS)),
      "乙".repeat(128)
    ].join(",");
    expect(exactHeader).toHaveLength(MAX_CASE_IMPORT_HEADER_CHARACTERS);

    const parsed = await readCaseImportHeadersFromSource(
      createStringCsvSource(`${exactHeader}\r\n数据`)
    );
    expect(parsed).toHaveLength(128);
    expect(parsed[0]).toBe(`${"甲".repeat(252)}"乙`);

    await expect(readCaseImportHeadersFromSource(
      createStringCsvSource(`${exactHeader}丙\r\n数据`)
    )).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code: "CSV_HEADER_TOO_LARGE" })]
    });
  });

  it("keeps RFC 4180 state across every possible one-character boundary", () => {
    const source = '\ufeff列一,列二\r\n"跨\r\n块","双""引号"\r\n坏"值,x\r\n"未闭合';
    const parser = createRfc4180CsvIncrementalParser();
    for (let index = 0; index < source.length; index += 1) {
      parser.write(source.slice(index, index + 1));
    }

    const expected = parseRfc4180Csv(source);
    expect(parser.finish()).toEqual(expected);
    expect(parser.finish()).toEqual(expected);
    expect(expected.records[1]).toMatchObject({
      rowNumber: 2,
      cells: ["跨\r\n块", '双"引号'],
      issues: []
    });
    expect(expected.records.at(-1)?.issues).toEqual([
      expect.objectContaining({ code: "CSV_UNCLOSED_QUOTE", rowNumber: 5 })
    ]);
  });

  it("matches the synchronous parser field-for-field while reporting bounded async progress", async () => {
    const source = '\ufeffa,b\r\n"甲,乙","一行\r\n二行 ""原话"""\r独立,尾行\n';
    const progress: CsvParseProgress[] = [];
    const parsed = await parseRfc4180CsvAsync(source, {
      characterBudget: 3,
      onProgress: (value) => { progress.push(value); },
      yieldControl: async () => undefined
    });

    expect(parsed).toEqual(parseRfc4180Csv(source));
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.map((item) => item.processedCharacters)).toEqual(
      [...progress.map((item) => item.processedCharacters)].sort((left, right) => left - right)
    );
    expect(progress.at(-1)).toEqual({
      processedCharacters: source.length,
      totalCharacters: source.length,
      parsedRecords: parsed.records.length,
      percent: 100
    });
  });

  it("yields complete records before the source is exhausted across arbitrary one-character chunks", async () => {
    const source = '\ufeffa,b\r\n"跨\r\n行","双""引号"\r\n末行,x';
    const progress: CsvParseProgress[] = [];
    async function* oneCharacterChunks(): AsyncGenerator<string, void, void> {
      yield "";
      for (const character of source) yield character;
      yield "";
    }
    const iterator = iterateRfc4180CsvRecords(oneCharacterChunks(), {
      characterBudget: 1,
      totalCharacters: source.length,
      onProgress: (value) => { progress.push(value); },
      yieldControl: async () => undefined
    });

    const first = await iterator.next();
    expect(first).toMatchObject({ done: false, value: { rowNumber: 1, cells: ["a", "b"], issues: [] } });
    expect(progress.at(-1)?.processedCharacters).toBeLessThan(source.length);

    const streamed = first.done ? [] : [first.value];
    let finalProgress: CsvParseProgress | undefined;
    while (true) {
      const result = await iterator.next();
      if (result.done) {
        finalProgress = result.value;
        break;
      }
      streamed.push(result.value);
    }

    expect(streamed).toEqual(parseRfc4180Csv(source).records);
    expect(finalProgress).toEqual({
      processedCharacters: source.length,
      totalCharacters: source.length,
      parsedRecords: streamed.length,
      percent: 100
    });
  });

  it("keeps the record-stream buffer bounded instead of retaining every parsed record", async () => {
    const totalRecords = 4_001;
    const source = ["h", ...Array.from({ length: totalRecords - 1 }, () => "x")].join("\n");
    let peakBufferedRecords = 0;
    let consumedRecords = 0;

    for await (const _record of iterateRfc4180CsvRecords(source, {
      characterBudget: source.length,
      onBufferedRecordCountChange: (count) => {
        peakBufferedRecords = Math.max(peakBufferedRecords, count);
      }
    })) {
      consumedRecords += 1;
    }

    expect(consumedRecords).toBe(totalRecords);
    expect(peakBufferedRecords).toBeGreaterThan(0);
    expect(peakBufferedRecords).toBeLessThan(totalRecords / 2);
  });

  it("rejects inaccurate iterable totals without suppressing bounded cancellation yields", async () => {
    const tooSmallYield = vi.fn(async () => undefined);
    const consume = async (totalCharacters: number, yieldControl = async () => undefined) => {
      for await (const _record of iterateRfc4180CsvRecords(["ab", "cd"], {
        totalCharacters,
        characterBudget: 2,
        yieldControl
      })) {
        // Consume the stream so its terminal length contract is checked.
      }
    };

    await expect(consume(2, tooSmallYield)).rejects.toThrowError(
      "totalCharacters 与字符块的实际长度不一致"
    );
    expect(tooSmallYield).toHaveBeenCalledTimes(1);
    await expect(consume(5)).rejects.toThrowError(
      "totalCharacters 与字符块的实际长度不一致"
    );
  });

  it("cancels within one long streamed record and retries with a clean parser", async () => {
    const source = `header\r\n"${"长".repeat(20_000)}"`;
    const controller = new AbortController();
    const iterator = iterateRfc4180CsvRecords(source, {
      characterBudget: 128,
      signal: controller.signal,
      yieldControl: async () => { controller.abort(); }
    });

    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: { rowNumber: 1, cells: ["header"] }
    });
    await expect(iterator.next()).rejects.toEqual(expect.objectContaining({
      name: "CaseImportCancelledError",
      code: "IMPORT_CANCELLED"
    }));

    const retried = [];
    for await (const record of iterateRfc4180CsvRecords(source, {
      characterBudget: 257,
      yieldControl: async () => undefined
    })) {
      retried.push(record);
    }
    expect(retried).toEqual(parseRfc4180Csv(source).records);
    expect(retried[1]).toMatchObject({ rowNumber: 2, issues: [] });
  });

  it("discards one over-limit logical record and resumes at the next record boundary", async () => {
    const source = "h\n12345678\n\"1234\n56789\"\nok";
    const records = [];

    for await (const record of iterateRfc4180CsvRecords(source, {
      recordCharacterLimit: 8,
      characterBudget: 3,
      yieldControl: async () => undefined
    })) {
      records.push(record);
    }

    expect(records[1]).toEqual({ rowNumber: 2, cells: ["12345678"], issues: [] });
    expect(records[2]).toEqual({
      rowNumber: 3,
      cells: [],
      issues: [{
        code: "CSV_RECORD_TOO_LARGE",
        rowNumber: 3,
        columnNumber: 1,
        message: "CSV 单条数据记录不能超过 8 个 UTF-16 字符；该行内容已丢弃以保护浏览器内存"
      }]
    });
    expect(records[3]).toEqual({ rowNumber: 5, cells: ["ok"], issues: [] });
  });
});

describe("case import mapping and row validation", () => {
  it("creates exact-minute and genuine unknown-hour candidates with explicit timezone, sex and coordinates", async () => {
    const csv = csvWith([
      exactRow(),
      exactRow({
        案例名: "时辰待考",
        出生日期: "2001-02-03",
        出生时间: "",
        时间精度: "未知时辰",
        性别: "未指定",
        地点: "加德满都",
        纬度: "27.7172",
        经度: "85.3240",
        IANA时区: "Asia/Kathmandu"
      })
    ]);
    const plan = await buildCaseImportPlan(csv, { mapping });

    expect(plan.stats).toMatchObject({ totalRows: 2, importableRows: 2, invalidRows: 0 });
    expect(plan.imports[0].input).toMatchObject({
      time: "14:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "male",
      location: { latitude: 31.2304, longitude: 121.4737, precision: "coordinates" }
    });
    expect(plan.imports[1].input).toMatchObject({
      time: null,
      timePrecision: "unknown_hour",
      timeZone: "Asia/Kathmandu",
      sex: "unspecified"
    });
  });

  it("uses stable row codes and does not let bad rows block good rows", async () => {
    const csv = csvWith([
      exactRow({ 案例名: "错误时区", IANA时区: "China/Nowhere" }),
      exactRow({ 案例名: "缺经度", 经度: "" }),
      exactRow({ 案例名: "未知却有时间", 时间精度: "未知时辰" }),
      exactRow({ 案例名: "正确行", 出生日期: "1999-09-09" })
    ]);
    const plan = await buildCaseImportPlan(csv, { mapping });

    expect(plan.stats).toMatchObject({ totalRows: 4, importableRows: 1, invalidRows: 3 });
    expect(plan.imports.map((candidate) => candidate.alias)).toEqual(["正确行"]);
    expect(plan.rows[0].status === "invalid" && plan.rows[0].errors.map((error) => error.code)).toContain("INVALID_TIME_ZONE");
    expect(plan.rows[1].status === "invalid" && plan.rows[1].errors.map((error) => error.code)).toContain("COORDINATE_PAIR_REQUIRED");
    expect(plan.rows[2].status === "invalid" && plan.rows[2].errors.map((error) => error.code)).toContain("UNKNOWN_HOUR_TIME_MUST_BE_EMPTY");
    expect(plan.allowsPartialImport).toBe(true);
  });

  it("rejects missing or ambiguous header mappings before row processing", async () => {
    const missing = { ...mapping, alias: "不存在" };
    await expect(buildCaseImportPlan(csvWith([exactRow()]), { mapping: missing })).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code: "HEADER_NOT_FOUND", field: "alias" })]
    });

    const duplicateHeaderCsv = "案例名,案例名,出生日期,时间精度,IANA时区,性别\r\na,b,1995-08-18,未知时辰,Asia/Shanghai,男";
    await expect(buildCaseImportPlan(duplicateHeaderCsv, {
      mapping: {
        alias: "案例名",
        date: "出生日期",
        timePrecision: "时间精度",
        timeZone: "IANA时区",
        sex: "性别"
      }
    })).rejects.toBeInstanceOf(CaseImportConfigurationError);
  });

  it("keeps formula-shaped cells as inert text without rewriting or evaluating them", async () => {
    const alias = "=1+1";
    const note = '=WEBSERVICE("https://invalid.example")';
    const plan = await buildCaseImportPlan(csvWith([exactRow({ 案例名: alias, 来源备注: note, 标签: "=SUM(A1:A2)" })]), { mapping });

    expect(plan.imports[0]).toMatchObject({ alias, sourceNote: note, tags: ["=SUM(A1:A2)"] });
    expect(plan.imports[0].input.sourceNote).toBe(note);
  });
});

describe("birth fingerprint duplicate policies", () => {
  const duplicateCsv = () => csvWith([
    exactRow({ 案例名: "甲", 标签: "A", 来源备注: "第一来源", 地点: "上海市" }),
    exactRow({ 案例名: "乙", 标签: "B", 来源备注: "第二来源", 地点: "Shanghai" })
  ]);

  it("excludes alias, tags, notes and location display label from a versioned stable fingerprint", async () => {
    const plan = await buildCaseImportPlan(duplicateCsv(), { mapping, duplicatePolicy: "import_copy" });
    expect(plan.imports).toHaveLength(2);
    expect(plan.imports[0].fingerprint).toBe(plan.imports[1].fingerprint);
    expect(plan.imports[0].fingerprint).toMatch(new RegExp(`^${BIRTH_FINGERPRINT_VERSION}:`));

    const changedTime: BirthInput = { ...plan.imports[0].input, time: "14:31" };
    expect(await createBirthFingerprint(changedTime)).not.toBe(plan.imports[0].fingerprint);
  });

  it.each([
    ["skip", 1, 0, 1],
    ["import_copy", 2, 0, 0],
    ["error", 1, 1, 0]
  ] as const)("applies %s without losing the first valid row", async (policy, imports, invalid, skipped) => {
    const plan = await buildCaseImportPlan(duplicateCsv(), { mapping, duplicatePolicy: policy });
    expect(plan.stats).toMatchObject({ importableRows: imports, invalidRows: invalid, skippedRows: skipped, duplicateRows: 1 });
    expect(plan.imports).toHaveLength(imports);
  });

  it("detects a fingerprint supplied by the persistence layer without writing to it", async () => {
    const first = await buildCaseImportPlan(csvWith([exactRow()]), { mapping });
    const plan = await buildCaseImportPlan(csvWith([exactRow({ 案例名: "另一个别名" })]), {
      mapping,
      existingFingerprints: [first.imports[0].fingerprint],
      duplicatePolicy: "skip"
    });
    expect(plan.imports).toEqual([]);
    expect(plan.rows[0]).toMatchObject({ status: "skipped_duplicate", duplicateSource: "existing_data" });
  });
});

describe("chunking, progress and cancellation", () => {
  function generatedCsv(size: number): string {
    const rows = Array.from({ length: size }, (_, index) => {
      const date = new Date(Date.UTC(1990, 0, index + 1)).toISOString().slice(0, 10);
      return exactRow({ 案例名: `案例-${index}`, 出生日期: date, 来源备注: `fixture-${index}` });
    });
    return csvWith(rows);
  }

  it("streams batches while preserving blank-row counts, logical record numbers and physical rows", async () => {
    const source = [
      csvRow(headers),
      csvRow(exactRow({ 案例名: "跨行案例", 来源备注: "第一行\r\n第二行" })),
      "",
      csvRow(exactRow({ 案例名: "空行之后", 出生日期: "1996-09-19" }))
    ].join("\r\n");
    const iterator = iterateCaseImport(source, { mapping, chunkSize: 1 });

    const first = await iterator.next();
    expect(first.done).toBe(false);
    if (first.done) throw new Error("首批不应提前结束");
    expect(first.value).toMatchObject({
      batchNumber: 1,
      rows: [{ rowNumber: 2, recordNumber: 2 }],
      progress: {
        totalRows: 2,
        processedRows: 1,
        ignoredBlankRows: 1,
        percent: 50
      }
    });

    const second = await iterator.next();
    expect(second.done).toBe(false);
    if (second.done) throw new Error("第二批不应提前结束");
    expect(second.value).toMatchObject({
      batchNumber: 2,
      rows: [{ rowNumber: 5, recordNumber: 4 }],
      progress: {
        totalRows: 2,
        processedRows: 2,
        ignoredBlankRows: 1,
        percent: 100
      }
    });

    const completed = await iterator.next();
    expect(completed).toMatchObject({
      done: true,
      value: { stats: { totalRows: 2, processedRows: 2, ignoredBlankRows: 1 } }
    });
  });

  it("builds a 1000-row plan in bounded chunks with monotonic preview progress", async () => {
    const progress = vi.fn();
    const startedAt = performance.now();
    const plan = await buildCaseImportPlan(generatedCsv(1000), {
      mapping,
      chunkSize: 128,
      onProgress: progress
    });
    const elapsedMs = performance.now() - startedAt;

    expect(plan.stats).toMatchObject({ totalRows: 1000, processedRows: 1000, importableRows: 1000, invalidRows: 0 });
    expect(progress).toHaveBeenCalledTimes(8);
    expect(progress.mock.calls.map(([value]) => value.percent)).toEqual([...progress.mock.calls.map(([value]) => value.percent)].sort((a, b) => a - b));
    expect(progress.mock.lastCall?.[0]).toMatchObject({ percent: 100, processedRows: 1000 });
    expect(elapsedMs).toBeLessThan(10_000);
  }, 15_000);

  it("preflights a 5000-row mixed fixture with exact counts and bounded yields", async () => {
    const validExact = Array.from({ length: 4600 }, (_, index) => {
      const date = new Date(Date.UTC(1990, 0, (index % 3000) + 1)).toISOString().slice(0, 10);
      const hour = String(Math.floor(index / 60) % 24).padStart(2, "0");
      const minute = String(index % 60).padStart(2, "0");
      return exactRow({ 案例名: `精确-${index}`, 出生日期: date, 出生时间: `${hour}:${minute}` });
    });
    const unknown = Array.from({ length: 200 }, (_, index) => {
      const date = new Date(Date.UTC(2005, 0, index + 1)).toISOString().slice(0, 10);
      return exactRow({ 案例名: `待考-${index}`, 出生日期: date, 出生时间: "", 时间精度: "未知时辰" });
    });
    const invalid = Array.from({ length: 100 }, (_, index) =>
      exactRow({ 案例名: `坏行-${index}`, IANA时区: `Invalid/Zone-${index}` })
    );
    const duplicates = validExact.slice(0, 100).map((row, index) => {
      const copy = [...row];
      copy[0] = `重复-${index}`;
      return copy;
    });
    const progress = vi.fn();
    const parseProgress: CsvParseProgress[] = [];
    const source = csvWith([...validExact, ...unknown, ...invalid, ...duplicates]);
    const plan = await buildCaseImportPlan(source, {
      mapping,
      duplicatePolicy: "skip",
      chunkSize: 200,
      parseCharacterBudget: 8_192,
      onProgress: progress,
      onParseProgress: (value) => { parseProgress.push(value); }
    });

    expect(plan.stats).toMatchObject({
      totalRows: 5000,
      processedRows: 5000,
      importableRows: 4800,
      invalidRows: 100,
      duplicateRows: 100,
      skippedRows: 100
    });
    expect(plan.imports.filter((candidate) => candidate.input.timePrecision === "unknown_hour")).toHaveLength(200);
    expect(progress).toHaveBeenCalledTimes(25);
    expect(progress.mock.lastCall?.[0]).toMatchObject({ percent: 100, processedRows: 5000 });
    expect(parseProgress.length).toBeGreaterThan(1);
    expect(parseProgress.at(-1)).toEqual({
      processedCharacters: source.length,
      totalCharacters: source.length,
      parsedRecords: MAX_CASE_IMPORT_ROWS + 1,
      percent: 100
    });
  }, 45_000);

  it("在解析第 5001 个数据记录时立即以稳定错误码拒绝，避免继续构造超大计划", async () => {
    await expect(buildCaseImportPlan(generatedCsv(MAX_CASE_IMPORT_ROWS + 1), { mapping }))
      .rejects.toMatchObject({
        code: "CASE_IMPORT_CONFIGURATION_INVALID",
        issues: [expect.objectContaining({ code: "ROW_LIMIT_EXCEEDED" })]
      });

    const tooManyBlankRows = `${csvRow(headers)}\n${"\n".repeat(MAX_CASE_IMPORT_ROWS + 1)}`;
    await expect(buildCaseImportPlan(tooManyBlankRows, { mapping }))
      .rejects.toMatchObject({
        code: "CASE_IMPORT_CONFIGURATION_INVALID",
        issues: [expect.objectContaining({ code: "ROW_LIMIT_EXCEEDED" })]
      });

    const maximumBlankRows = `${csvRow(headers)}\n${"\n".repeat(MAX_CASE_IMPORT_ROWS)}`;
    const maximumBlankPlan = await buildCaseImportPlan(maximumBlankRows, { mapping });
    expect(maximumBlankPlan.stats).toMatchObject({
      totalRows: 0,
      processedRows: 0,
      ignoredBlankRows: MAX_CASE_IMPORT_ROWS
    });
  }, 15_000);

  it("stops between chunks through AbortSignal with a stable cancellation code", async () => {
    const controller = new AbortController();
    const iterator = iterateCaseImport(generatedCsv(1200), {
      mapping,
      chunkSize: 100,
      signal: controller.signal
    });

    const first = await iterator.next();
    expect(first.done).toBe(false);
    if (first.done) throw new Error("首个导入分块不应提前结束");
    expect(first.value.progress.processedRows).toBe(100);
    controller.abort();
    await expect(iterator.next()).rejects.toEqual(expect.objectContaining({
      name: "CaseImportCancelledError",
      code: "IMPORT_CANCELLED"
    }));
    expect(new CaseImportCancelledError().code).toBe("IMPORT_CANCELLED");
  });

  it("matches the string plan through exactly two complete byte-unit source passes", async () => {
    const text = [
      csvRow(headers),
      csvRow(exactRow({ 案例名: "Source 一", 来源备注: "跨行\r\n备注" })),
      "",
      csvRow(exactRow({ 案例名: "Source 二", 出生日期: "1998-10-20" }))
    ].join("\r\n");
    const encoder = new TextEncoder();
    let openCount = 0;
    let completedPasses = 0;
    const source: RepeatableDecodedCsvSource = {
      unit: "utf8_bytes",
      totalUnits: encoder.encode(text).length,
      async *open(signal) {
        openCount += 1;
        let offset = 0;
        let processedBytes = 0;
        while (offset < text.length) {
          if (signal?.aborted) throw new CaseImportCancelledError();
          const end = Math.min(text.length, offset + 37);
          const chunkText = text.slice(offset, end);
          processedBytes += encoder.encode(chunkText).length;
          yield { text: chunkText, processedUnits: processedBytes };
          offset = end;
        }
        completedPasses += 1;
      }
    };
    const sourceProgress: CsvSourceProgress[] = [];
    const legacyParseProgress = vi.fn();

    const [expected, actual] = await Promise.all([
      buildCaseImportPlan(text, { mapping, chunkSize: 1 }),
      buildCaseImportPlanFromSource(source, {
        mapping,
        chunkSize: 1,
        onSourceProgress: (progress) => { sourceProgress.push(progress); },
        onParseProgress: legacyParseProgress
      })
    ]);

    expect(actual).toEqual(expected);
    expect(openCount).toBe(2);
    expect(completedPasses).toBe(2);
    expect(legacyParseProgress).not.toHaveBeenCalled();
    expect(sourceProgress).toHaveLength(Math.ceil(text.length / 37));
    expect(sourceProgress.every((progress) => progress.unit === "utf8_bytes")).toBe(true);
    expect(sourceProgress.map((progress) => progress.processedUnits)).toEqual(
      [...sourceProgress.map((progress) => progress.processedUnits)].sort((left, right) => left - right)
    );
    expect(sourceProgress.map((progress) => progress.parsedRecords)).toEqual(
      [...sourceProgress.map((progress) => progress.parsedRecords)].sort((left, right) => left - right)
    );
    expect(sourceProgress.filter((progress) => progress.percent === 100)).toHaveLength(1);
    expect(sourceProgress.at(-1)).toMatchObject({
      processedUnits: source.totalUnits,
      totalUnits: source.totalUnits,
      parsedRecords: 4,
      percent: 100
    });
  });

  it("stops a source header read after its first decoded chunk", async () => {
    const headerText = `${csvRow(headers)}\r\n`;
    const firstChunk = `${headerText}${"后续数据".repeat(1_000)}`;
    const secondChunk = "不应读取";
    let yieldedChunks = 0;
    let closed = false;
    const source: RepeatableDecodedCsvSource = {
      unit: "utf16_code_units",
      totalUnits: firstChunk.length + secondChunk.length,
      async *open() {
        try {
          yieldedChunks += 1;
          yield { text: firstChunk, processedUnits: firstChunk.length };
          yieldedChunks += 1;
          yield {
            text: secondChunk,
            processedUnits: firstChunk.length + secondChunk.length
          };
        } finally {
          closed = true;
        }
      }
    };

    await expect(readCaseImportHeadersFromSource(source)).resolves.toEqual(headers);
    expect(yieldedChunks).toBe(1);
    expect(closed).toBe(true);
  });

  it("rejects a non-repeatable source when the second-pass header changes", async () => {
    const firstText = csvWith([exactRow()]);
    const secondText = firstText.replace("案例名", "案例号");
    expect(secondText).toHaveLength(firstText.length);
    let openCount = 0;
    const source: RepeatableDecodedCsvSource = {
      unit: "utf16_code_units",
      totalUnits: firstText.length,
      async *open() {
        openCount += 1;
        const text = openCount === 1 ? firstText : secondText;
        yield { text, processedUnits: text.length };
      }
    };

    await expect(buildCaseImportPlanFromSource(source, { mapping })).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code: "CSV_SOURCE_HEADER_MISMATCH" })]
    });
    expect(openCount).toBe(2);
  });

  it("cancels a source during its first pass and cleanly reopens it for retry", async () => {
    const text = generatedCsv(120);
    const base = createStringCsvSource(text, 256);
    let openCount = 0;
    const source: RepeatableDecodedCsvSource = {
      ...base,
      open(signal) {
        openCount += 1;
        return base.open(signal);
      }
    };
    const controller = new AbortController();

    await expect(buildCaseImportPlanFromSource(source, {
      mapping,
      signal: controller.signal,
      onSourceProgress: () => { controller.abort(); }
    })).rejects.toEqual(expect.objectContaining({
      name: "CaseImportCancelledError",
      code: "IMPORT_CANCELLED"
    }));
    expect(openCount).toBe(1);

    const retried = await buildCaseImportPlanFromSource(source, { mapping, chunkSize: 31 });
    expect(retried.stats).toMatchObject({ totalRows: 120, processedRows: 120, importableRows: 120 });
    expect(openCount).toBe(3);
  });

  it("rejects invalid source totals and cumulative progress with stable codes", async () => {
    await expect(buildCaseImportPlan(csvWith([exactRow()]), {
      mapping,
      parseCharacterBudget: 0
    })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "INVALID_PARSE_CHARACTER_BUDGET" })]
    });

    const unopened = vi.fn(async function* () {
      yield { text: "", processedUnits: 0 };
    });
    const invalidTotal = {
      unit: "utf8_bytes",
      totalUnits: -1,
      open: unopened
    } as RepeatableDecodedCsvSource;
    await expect(buildCaseImportPlanFromSource(invalidTotal, { mapping })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "CSV_SOURCE_TOTAL_INVALID" })]
    });
    expect(unopened).not.toHaveBeenCalled();

    const consume = async (source: RepeatableDecodedCsvSource) => {
      for await (const _record of iterateRfc4180CsvRecordsFromSource(source)) {
        // Exhaust the source so its terminal progress contract is checked.
      }
    };
    await expect(consume({
      unit: "utf8_bytes",
      totalUnits: 5,
      async *open() {
        yield { text: "a", processedUnits: 3 };
        yield { text: "b", processedUnits: 2 };
      }
    })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "CSV_SOURCE_PROGRESS_INVALID" })]
    });
    await expect(consume({
      unit: "utf8_bytes",
      totalUnits: 5,
      async *open() {
        yield { text: "abc", processedUnits: 3 };
      }
    })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "CSV_SOURCE_PROGRESS_INVALID" })]
    });
    await expect(consume({
      unit: "utf16_code_units",
      totalUnits: 3,
      async *open() {
        yield { text: "abc", processedUnits: 2 };
      }
    })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: "CSV_SOURCE_PROGRESS_INVALID" })]
    });

    expect(new CaseImportConfigurationError([{
      code: "CSV_INVALID_UTF8",
      message: "UTF-8 无效"
    }]).issues[0].code).toBe("CSV_INVALID_UTF8");
  });

  it("cancels inside one oversized record at the character budget and can retry from a clean parser", async () => {
    const oversizedNote = "长".repeat(750_000);
    const source = csvWith([exactRow({ 案例名: "超长单记录", 来源备注: oversizedNote })]);
    const controller = new AbortController();
    const parseProgress: CsvParseProgress[] = [];
    const abortTimer = globalThis.setTimeout(() => controller.abort(), 0);

    await expect(buildCaseImportPlan(source, {
      mapping,
      signal: controller.signal,
      parseCharacterBudget: 2_048,
      onParseProgress: (value) => { parseProgress.push(value); }
    })).rejects.toEqual(expect.objectContaining({
      name: "CaseImportCancelledError",
      code: "IMPORT_CANCELLED"
    }));
    globalThis.clearTimeout(abortTimer);
    expect(parseProgress).toHaveLength(1);
    expect(parseProgress[0].processedCharacters).toBe(2_048);
    expect(parseProgress[0].processedCharacters).toBeLessThan(source.length);

    const retried = await buildCaseImportPlan(source, {
      mapping,
      parseCharacterBudget: source.length
    });
    expect(retried.stats).toMatchObject({ totalRows: 1, processedRows: 1, invalidRows: 1 });
    expect(retried.rows[0]).toMatchObject({
      status: "invalid",
      errors: [expect.objectContaining({ code: "CSV_RECORD_TOO_LARGE" })]
    });
  }, 15_000);

  it("keeps good rows before and after an oversized row importable", async () => {
    const source = csvWith([
      exactRow({ 案例名: "超限前", 出生日期: "1990-01-01" }),
      exactRow({ 案例名: "超限行", 出生日期: "1991-01-01", 来源备注: "长".repeat(MAX_CASE_IMPORT_RECORD_CHARACTERS + 1) }),
      exactRow({ 案例名: "超限后", 出生日期: "1992-01-01" })
    ]);

    const plan = await buildCaseImportPlan(source, { mapping, chunkSize: 1 });

    expect(plan.stats).toMatchObject({
      totalRows: 3,
      processedRows: 3,
      importableRows: 2,
      invalidRows: 1,
      duplicateRows: 0,
      skippedRows: 0
    });
    expect(plan.rows.map((row) => row.status)).toEqual(["ready", "invalid", "ready"]);
    expect(plan.rows[1]).toMatchObject({
      status: "invalid",
      errors: [expect.objectContaining({ code: "CSV_RECORD_TOO_LARGE" })]
    });
    expect(plan.imports.map((candidate) => candidate.alias)).toEqual(["超限前", "超限后"]);
  });
});
