import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { CaseImportCancelledError, type CaseImportOptions, type CaseImportPlan } from "@hakimi/case-import";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import * as caseImportWorkerClient from "../lib/case-import-worker-client";
import { CsvCaseImporter } from "./csv-case-importer";

const { saveTextFileMock, pickFileMock } = vi.hoisted(() => ({
  saveTextFileMock: vi.fn(),
  pickFileMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  saveTextFile: saveTextFileMock,
  pickFile: pickFileMock
}));

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

function csvRow(values: string[]): string {
  return values.map((value) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(",");
}

function exactRow(overrides: Partial<Record<(typeof headers)[number], string>> = {}): string[] {
  const values: Record<(typeof headers)[number], string> = {
    案例名: "可导入案例",
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
    标签: "样本|CSV",
    来源备注: "测试来源",
    ...overrides
  };
  return headers.map((header) => values[header]);
}

function pickedFileForText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const size = blob.size;
  return { name, size, type: "text/csv", blob };
}

function fileFor(rows: string[][]) {
  const text = [csvRow(headers), ...rows.map(csvRow)].join("\r\n");
  return pickedFileForText("cases.csv", text);
}

beforeEach(async () => {
  saveTextFileMock.mockReset().mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  pickFileMock.mockReset();
  await caseRepository.clearAll();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await caseRepository.clearAll();
});

describe("CsvCaseImporter", () => {
  async function chooseAndPreflight() {
    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    fireEvent.click(await screen.findByRole("button", { name: "按此映射预检" }));
  }

  it("提供模板、显式字段映射，并诚实区分错误行与未知时辰候选组", async () => {
    const picked = fileFor([
      exactRow(),
      exactRow({ 案例名: "时辰待考", 出生日期: "2001-02-03", 出生时间: "", 时间精度: "未知时辰", 性别: "未指定" }),
      exactRow({ 案例名: "错误时区", IANA时区: "China/Nowhere" })
    ]);
    pickFileMock.mockResolvedValueOnce(picked);

    render(<CsvCaseImporter />);
    fireEvent.click(screen.getByRole("button", { name: "下载 CSV 模板" }));
    expect(saveTextFileMock).toHaveBeenCalledTimes(1);
    expect(saveTextFileMock.mock.calls[0][0]).toBe("hakimi-bazi-case-import-template.csv");
    expect(saveTextFileMock.mock.calls[0][1]).toContain("案例名,历法,出生日期,出生时间,时间精度,IANA时区");

    await chooseAndPreflight();
    expect(await screen.findByText(/预检完成：3 行中，2 行通过格式校验/)).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "CSV 预检进度" })).toBeNull();

    const stats = screen.getByLabelText("CSV 预检统计");
    expect(within(stats).getByText("精确时间可写入").previousElementSibling?.textContent).toBe("1");
    expect(within(stats).getByText("未知时辰候选组").previousElementSibling?.textContent).toBe("1");
    expect(within(stats).getByText("格式错误").previousElementSibling?.textContent).toBe("1");
    const unknownHourBoundary = screen.getByText("未知时辰仍然不会被补成某个出生时刻。").parentElement;
    expect(unknownHourBoundary?.textContent).toContain("time=null");
    expect(unknownHourBoundary?.textContent).toContain("13 个代表性探针");
    expect(screen.getByText(/INVALID_TIME_ZONE/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "下载完整预检/导入报告" }));
    expect(saveTextFileMock).toHaveBeenCalledTimes(2);
    expect(saveTextFileMock.mock.calls[1][1]).toContain("时辰待考,unknown_hour,可写入候选组");
    expect(saveTextFileMock.mock.calls[1][1]).toContain("INVALID_TIME_ZONE");
  });

  it("同时写入 exact_minute 命盘和 unknown_hour 候选组，且不造出生时间", async () => {
    const picked = fileFor([
      exactRow(),
      exactRow({ 案例名: "时辰待考", 出生日期: "2001-02-03", 出生时间: "", 时间精度: "unknown_hour", 性别: "unspecified" }),
      exactRow({ 案例名: "错误时区", IANA时区: "China/Nowhere" })
    ]);
    pickFileMock.mockResolvedValueOnce(picked);
    const onImported = vi.fn();

    render(<CsvCaseImporter onImported={onImported} />);
    await chooseAndPreflight();
    await screen.findByText(/预检完成/);
    fireEvent.click(screen.getByRole("button", { name: "导入 2 条记录" }));

    expect(await screen.findByText(
      /本轮完成：成功写入 2 行，提交时跳过重复 0 行，失败 0 行/,
      {},
      { timeout: 5_000 }
    )).toBeTruthy();
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    const stored = await caseRepository.listCases();
    expect(stored.map((record) => record.alias)).toEqual(["可导入案例"]);
    const bundle = await caseRepository.getCase(stored[0].id);
    expect(bundle?.revisions[0].input).toMatchObject({
      time: "14:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai"
    });
    const candidateSets = await caseRepository.listCandidateSets();
    expect(candidateSets).toHaveLength(1);
    expect(candidateSets[0]).toMatchObject({ alias: "时辰待考", candidateSet: { input: { time: null, timePrecision: "unknown_hour" }, probeCount: 13 } });
    expect(screen.getByRole("button", { name: "没有待导入记录" })).toHaveProperty("disabled", true);
  });

  it("可把非模板列显式映射为必填字段", async () => {
    const text = "姓名,生日,精度,时区,性别\r\n映射样本,1999-09-09,未知时辰,Asia/Shanghai,未指定";
    pickFileMock.mockResolvedValueOnce(pickedFileForText("custom.csv", text));
    render(<CsvCaseImporter />);
    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    const selects = await screen.findAllByRole("combobox");
    const byLabel = (label: string) => screen.getByLabelText(label, { exact: false });
    fireEvent.change(byLabel("案例别名"), { target: { value: "0" } });
    fireEvent.change(byLabel("出生日期"), { target: { value: "1" } });
    fireEvent.change(byLabel("时间精度"), { target: { value: "2" } });
    fireEvent.change(byLabel("IANA 时区"), { target: { value: "3" } });
    fireEvent.change(byLabel("性别"), { target: { value: "4" } });
    expect(selects.length).toBeGreaterThanOrEqual(14);
    fireEvent.click(screen.getByRole("button", { name: "按此映射预检" }));
    expect(await screen.findByText(/预检完成：1 行中，1 行通过格式校验/)).toBeTruthy();
  });

  it("预检可取消，且取消前不写库", async () => {
    const picked = fileFor([exactRow()]);
    pickFileMock.mockResolvedValueOnce(picked);
    let resolveFingerprints!: (fingerprints: string[]) => void;
    const blockedFingerprints = new Promise<string[]>((resolve) => { resolveFingerprints = resolve; });
    vi.spyOn(caseRepository, "listBirthFingerprints").mockReturnValueOnce(blockedFingerprints);

    render(<CsvCaseImporter />);
    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    fireEvent.click(await screen.findByRole("button", { name: "按此映射预检" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消预检" }));
    resolveFingerprints([]);

    expect(await screen.findByText(/已取消预检；没有写入任何案例/)).toBeTruthy();
    expect(await caseRepository.listCases()).toEqual([]);
  });

  it("以来源单位显示单调扫描进度，进入行处理后不倒退，并在取消、失败和重试时清空旧状态", async () => {
    const picked = fileFor([exactRow()]);
    pickFileMock.mockResolvedValueOnce(picked);
    const attempts: Array<{
      options: CaseImportOptions;
      reject: (reason?: unknown) => void;
    }> = [];
    vi.spyOn(caseImportWorkerClient, "buildCaseImportPlanOffMainThread").mockImplementation((_source, options) => (
      new Promise<CaseImportPlan>((_resolve, reject) => {
        attempts.push({ options, reject });
        options.signal?.addEventListener("abort", () => reject(new CaseImportCancelledError()), { once: true });
      })
    ));

    render(<CsvCaseImporter />);
    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    fireEvent.click(await screen.findByRole("button", { name: "按此映射预检" }));
    await waitFor(() => expect(attempts).toHaveLength(1));

    await act(async () => {
      await attempts[0].options.onSourceProgress?.({
        unit: "utf8_bytes",
        processedUnits: 80,
        totalUnits: 100,
        parsedRecords: 8,
        percent: 80
      });
    });
    expect(await screen.findByText("扫描 80 / 100 字节 · 8 条记录")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "CSV 预检进度" })).toHaveProperty("value", 24);

    await act(async () => {
      await attempts[0].options.onSourceProgress?.({
        unit: "utf8_bytes",
        processedUnits: 40,
        totalUnits: 100,
        parsedRecords: 4,
        percent: 40
      });
    });
    expect(screen.getByText("扫描 80 / 100 字节 · 8 条记录")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "CSV 预检进度" })).toHaveProperty("value", 24);

    await act(async () => {
      await attempts[0].options.onProgress?.({
        totalRows: 100,
        processedRows: 10,
        importableRows: 10,
        invalidRows: 0,
        duplicateRows: 0,
        skippedRows: 0,
        ignoredBlankRows: 0,
        batchNumber: 1,
        percent: 10
      });
    });
    expect(await screen.findByText("10 / 100 行")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "CSV 预检进度" })).toHaveProperty("value", 37);

    await act(async () => {
      await attempts[0].options.onSourceProgress?.({
        unit: "utf8_bytes",
        processedUnits: 100,
        totalUnits: 100,
        parsedRecords: 101,
        percent: 100
      });
    });
    expect(screen.getByRole("progressbar", { name: "CSV 预检进度" })).toHaveProperty("value", 37);

    fireEvent.click(screen.getByRole("button", { name: "取消预检" }));
    expect(await screen.findByText(/已取消预检；没有写入任何案例/)).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "CSV 预检进度" })).toBeNull();
    await act(async () => {
      await attempts[0].options.onSourceProgress?.({
        unit: "utf8_bytes",
        processedUnits: 100,
        totalUnits: 100,
        parsedRecords: 101,
        percent: 100
      });
    });
    expect(screen.queryByRole("progressbar", { name: "CSV 预检进度" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "按此映射预检" }));
    await waitFor(() => expect(attempts).toHaveLength(2));
    await act(async () => {
      await attempts[1].options.onSourceProgress?.({
        unit: "utf16_code_units",
        processedUnits: 50,
        totalUnits: 100,
        parsedRecords: 5,
        percent: 50
      });
    });
    expect(await screen.findByText("扫描 50 / 100 字符 · 5 条记录")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "CSV 预检进度" })).toHaveProperty("value", 15);

    await act(async () => attempts[1].reject(new Error("模拟来源扫描失败")));
    expect((await screen.findByRole("alert")).textContent).toContain("模拟来源扫描失败");
    expect(screen.queryByRole("progressbar", { name: "CSV 预检进度" })).toBeNull();
    expect(await caseRepository.listCases()).toEqual([]);
  });

  it("离开页面会在当前行边界停止导入，不继续后台写剩余行", async () => {
    const picked = fileFor([
      exactRow({ 案例名: "卸载边界一" }),
      exactRow({ 案例名: "卸载边界二", 出生日期: "1995-08-19" })
    ]);
    pickFileMock.mockResolvedValueOnce(picked);
    const originalCreateCase = caseRepository.createCase.bind(caseRepository);
    let releaseFirstWrite!: () => void;
    const firstWriteGate = new Promise<void>((resolve) => { releaseFirstWrite = resolve; });
    const createSpy = vi.spyOn(caseRepository, "createCase").mockImplementationOnce(async (input) => {
      await firstWriteGate;
      return originalCreateCase(input);
    });
    const onImported = vi.fn();

    const view = render(<CsvCaseImporter onImported={onImported} />);
    await chooseAndPreflight();
    await screen.findByText(/预检完成/);
    fireEvent.click(screen.getByRole("button", { name: "导入 2 条记录" }));
    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    view.unmount();
    releaseFirstWrite();

    await waitFor(async () => expect(await caseRepository.listCases()).toHaveLength(1));
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(onImported).not.toHaveBeenCalled();
  });

  it("新文件表头解析失败后清除旧预检计划，不能误提交上一文件", async () => {
    const first = fileFor([exactRow({ 案例名: "旧计划案例" })]);
    const malformedText = '"案例名,出生日期';
    const malformed = pickedFileForText("broken.csv", malformedText);
    pickFileMock.mockResolvedValueOnce(first).mockResolvedValueOnce(malformed);

    render(<CsvCaseImporter />);
    await chooseAndPreflight();
    expect(await screen.findByRole("button", { name: "导入 1 条记录" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    expect((await screen.findByRole("alert")).textContent).toContain("CSV 表头");
    expect(screen.queryByRole("button", { name: "导入 1 条记录" })).toBeNull();
    expect(screen.queryByText("cases.csv")).toBeNull();
    expect(await caseRepository.listCases()).toEqual([]);
  });

  it("刷新回调失败时仍明确说明数据已经写入，并吞掉回调拒绝", async () => {
    const picked = fileFor([exactRow({ 案例名: "已落库但刷新失败" })]);
    pickFileMock.mockResolvedValueOnce(picked);
    const onImported = vi.fn().mockRejectedValue(new Error("模拟刷新失败"));
    render(<CsvCaseImporter onImported={onImported} />);

    await chooseAndPreflight();
    await screen.findByText(/预检完成/);
    fireEvent.click(screen.getByRole("button", { name: "导入 1 条记录" }));

    expect(await screen.findByText(/成功写入 1 行/)).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toContain("数据已经写入，但页面列表刷新失败");
    expect((await caseRepository.listCases()).map((record) => record.alias)).toEqual(["已落库但刷新失败"]);
  });

  it("预检后出现并发重复时，提交事务按 skip 策略原子跳过且不进入重试死循环", async () => {
    const picked = fileFor([exactRow({ 案例名: "待提交案例" })]);
    pickFileMock.mockResolvedValueOnce(picked);
    const onImported = vi.fn();
    render(<CsvCaseImporter onImported={onImported} />);
    await chooseAndPreflight();
    await screen.findByText(/预检完成/);

    const chart = await calculateChart({
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "1995-08-18",
      time: "14:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "male",
      lunarLeapMonth: false,
      location: { label: "不同显示名", latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
      sourceNote: "不进入出生指纹"
    }, WORKING_DEFAULT_RULE_PROFILE);
    await caseRepository.createCase({ alias: "另一个页面先写入", calculated: chart });

    fireEvent.click(screen.getByRole("button", { name: "导入 1 条记录" }));
    expect(await screen.findByText(/成功写入 0 行，提交时跳过重复 1 行，失败 0 行/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "没有待导入记录" })).toHaveProperty("disabled", true);
    expect((await caseRepository.listCases()).map((record) => record.alias)).toEqual(["另一个页面先写入"]);
    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
  });

  it("预检后出现并发重复时，error 策略明确标错并拒绝第二次写入", async () => {
    const picked = fileFor([exactRow({ 案例名: "应标错案例" })]);
    pickFileMock.mockResolvedValueOnce(picked);
    render(<CsvCaseImporter />);
    fireEvent.click(screen.getByRole("button", { name: "选择 CSV" }));
    fireEvent.change(await screen.findByLabelText("重复出生输入策略"), { target: { value: "error" } });
    fireEvent.click(screen.getByRole("button", { name: "按此映射预检" }));
    await screen.findByText(/预检完成/);

    const chart = await calculateChart({
      schemaVersion: "1.0.0",
      calendarType: "gregorian",
      date: "1995-08-18",
      time: "14:30",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      sex: "male",
      lunarLeapMonth: false,
      location: { label: "另一页面", latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
      sourceNote: ""
    }, WORKING_DEFAULT_RULE_PROFILE);
    await caseRepository.createCase({ alias: "并发来源", calculated: chart });

    fireEvent.click(screen.getByRole("button", { name: "导入 1 条记录" }));
    expect(await screen.findByText(/成功写入 0 行，提交时跳过重复 0 行，失败 1 行/)).toBeTruthy();
    expect(screen.getByText(/本行已按标错策略拒绝写入/)).toBeTruthy();
    expect((await caseRepository.listCases()).map((record) => record.alias)).toEqual(["并发来源"]);
  });
});
