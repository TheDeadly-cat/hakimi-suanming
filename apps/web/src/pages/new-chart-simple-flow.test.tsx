import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as bazi from "@hakimi/bazi-core";
import { caseRepository } from "@hakimi/storage";
import { NewChartPage } from "./new-chart-page";

async function openSimple() {
  const view = render(<NewChartPage presentation="simple" />);
  await waitFor(() => expect(screen.queryByText("正在核对活动规则包")).toBeNull());
  return view;
}

function enterBirth(date = "1995-08-18", time = "08:26") {
  fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(/出生时间/), { target: { value: time } });
}

async function generateExact() {
  fireEvent.click(screen.getByRole("button", { name: "生成我的命盘" }));
  await screen.findByRole("heading", { name: "四柱候选结果" });
}

beforeEach(async () => {
  await caseRepository.clearAll();
  window.history.replaceState({}, "", "/new");
  window.scrollTo = vi.fn();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await caseRepository.clearAll();
});

describe("新建命盘的简化主流程", () => {
  it("空白表单不要求名称，真实计算仅预览，显式保存后打开该精确修订", async () => {
    const calculate = vi.spyOn(bazi, "calculateChart");
    const create = vi.spyOn(caseRepository, "createCase");
    await openSimple();

    expect(within(screen.getByRole("list", { name: "排盘步骤" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "先填写你的出生资料" })).toBeTruthy();
    expect(screen.getByLabelText(/命盘名称（可选）/)).toHaveProperty("value", "");
    expect(screen.getByLabelText(/命盘名称（可选）/)).toHaveProperty("required", false);
    expect(screen.getByRole("combobox", { name: "出生地时区" })).toHaveProperty("value", "Asia/Shanghai");
    for (const label of ["命盘名称与备注（可选）", "经纬度与太阳时对照（可选）", "时间校准与换日规则（通常无需更改）"]) {
      expect(screen.getByText(label).closest("details")).toHaveProperty("open", false);
    }
    enterBirth();
    await generateExact();

    expect(calculate).toHaveBeenCalledTimes(1);
    const generated = await calculate.mock.results[0]!.value;
    expect(create).not.toHaveBeenCalled();
    expect(await caseRepository.listCases()).toEqual([]);
    expect(window.location.pathname).toBe("/new");
    fireEvent.click(screen.getByRole("button", { name: "保存到本机并查看解读" }));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/cases\/[^/]+\/revisions\/[^/]+$/));

    expect(create).toHaveBeenCalledTimes(1);
    const records = await caseRepository.listCases();
    expect(records).toHaveLength(1);
    expect(records[0]!.alias).toBe("我的命盘 · 1995-08-18");
    const bundle = await caseRepository.getCase(records[0]!.id);
    expect(bundle!.revisions).toHaveLength(1);
    const saved = bundle!.revisions[0]!;
    expect(saved.input).toEqual(generated.input);
    expect(saved.input).toMatchObject({ date: "1995-08-18", time: "08:26", timeZone: "Asia/Shanghai", sex: "unspecified" });
    expect(saved.manifest.resultHash).toBe(generated.manifest.resultHash);
    expect(saved.manifest.ruleProfileDigest).toBe(generated.manifest.ruleProfileDigest);
    expect(window.location.pathname).toBe(`/cases/${records[0]!.id}/revisions/${saved.id}`);
  });

  it("未知时辰直接生成并显式保存独立候选组，不虚填时间或建立主盘", async () => {
    const calculate = vi.spyOn(bazi, "calculateUnknownHourCandidates");
    const createCase = vi.spyOn(caseRepository, "createCase");
    const createCandidates = vi.spyOn(caseRepository, "createCandidateSet");
    await openSimple();
    fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "1995-08-18" } });
    fireEvent.change(screen.getByRole("combobox", { name: /时间精度/ }), { target: { value: "unknown_hour" } });
    expect(screen.getByLabelText(/出生时间/)).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/出生时间/)).toHaveProperty("value", "");
    fireEvent.click(screen.getByRole("button", { name: "生成我的命盘" }));
    await screen.findByRole("heading", { name: "13 个代表性候选" }, { timeout: 10_000 });

    expect(calculate).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("article")).toHaveLength(13);
    expect(createCandidates).not.toHaveBeenCalled();
    expect(await caseRepository.listCandidateSets()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "保存并打开候选组" }));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/candidate-sets\/[^/]+$/));

    const records = await caseRepository.listCandidateSets();
    expect(records).toHaveLength(1);
    expect(records[0]!.alias).toBe("我的命盘 · 1995-08-18");
    expect(records[0]!.candidateSet.input).toMatchObject({ time: null, timePrecision: "unknown_hour" });
    expect(records[0]!.candidateSet.candidates).toHaveLength(13);
    expect(records[0]!.candidateSet).toEqual(await calculate.mock.results[0]!.value);
    expect(createCase).not.toHaveBeenCalled();
    expect(await caseRepository.listCases()).toEqual([]);
    expect(window.location.pathname).toBe(`/candidate-sets/${records[0]!.id}`);
  }, 20_000);

  it("出生资料不完整时留在输入页，保留已填值且不计算或写入", async () => {
    const calculate = vi.spyOn(bazi, "calculateChart");
    const create = vi.spyOn(caseRepository, "createCase");
    await openSimple();
    fireEvent.click(screen.getByRole("button", { name: "生成我的命盘" }));
    expect(screen.getByRole("alert").textContent).toContain("还不能继续");
    expect(screen.getByRole("heading", { name: "先填写你的出生资料" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "1995-08-18" } });
    fireEvent.click(screen.getByRole("button", { name: "生成我的命盘" }));
    expect(screen.getByLabelText(/出生日期/)).toHaveProperty("value", "1995-08-18");
    expect(screen.getByLabelText(/出生时间/).getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("heading", { name: "四柱候选结果" })).toBeNull();
    expect(calculate).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(await caseRepository.listCases()).toEqual([]);
  });

  it.each([
    ["重叠", "2024-11-03", "01:30", "2024-11-03T06:30:00Z"],
    ["空档", "2024-03-10", "02:30", "2024-03-10T07:30:00Z"]
  ])("DST%s必须明确选择偏移后才计算，保存原输入与对应瞬时", async (_label, date, time, instant) => {
    const calculate = vi.spyOn(bazi, "calculateChart");
    const create = vi.spyOn(caseRepository, "createCase");
    await openSimple();
    enterBirth(date, time);
    fireEvent.change(screen.getByRole("combobox", { name: "出生地时区" }), { target: { value: "America/New_York" } });
    expect(screen.getByText("时间校准与换日规则（通常无需更改）").closest("details")).toHaveProperty("open", true);
    fireEvent.click(screen.getByRole("button", { name: "生成我的命盘" }));
    expect(screen.getByRole("alert").textContent).toContain("请明确处理 DST 重叠或空档");
    expect(screen.getByRole("radio", { name: /先不选择/ })).toHaveProperty("checked", true);
    expect(calculate).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: /较晚方案/ }));
    expect(screen.getByText(instant)).toBeTruthy();
    await generateExact();
    expect(calculate.mock.calls[0]![0]).toMatchObject({ date, time, timeZone: "America/New_York" });
    expect(calculate.mock.calls[0]![2]).toMatchObject({ dstResolutionOverride: "later" });
    expect(await caseRepository.listCases()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "保存到本机并查看解读" }));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/cases\/[^/]+\/revisions\/[^/]+$/));
    const saved = await caseRepository.getCase((await caseRepository.listCases())[0]!.id);
    expect(saved!.revisions[0]!.input).toMatchObject({ date, time, timeZone: "America/New_York" });
    expect(saved!.revisions[0]!.timeCalibration.utcInstant).toBe(instant);
  });

  it.each(["call_unknown", "returned_unreconciled"] as const)("保存%s保留核对入口并锁住重试，已经落库的记录不会重复创建", async (certainty) => {
    const originalCreate = caseRepository.createCase.bind(caseRepository);
    const create = vi.spyOn(caseRepository, "createCase").mockImplementation(async (input) => {
      const written = await originalCreate(input);
      if (certainty === "call_unknown") throw new Error("写入后回执中断（合成故障）");
      return { ...written, revisions: [] };
    });
    const view = await openSimple();
    enterBirth();
    await generateExact();
    fireEvent.click(screen.getByRole("button", { name: "保存到本机并查看解读" }));
    await screen.findByRole("heading", { name: certainty === "call_unknown" ? "写入调用未知，不要在本页再次保存" : "写入已返回，不要在本页再次保存" });

    expect(view.container.querySelector("form")!.getAttribute("data-commit-certainty")).toBe(certainty);
    expect(screen.getByRole("link", { name: /前往案例库核对/ }).getAttribute("href")).toBe("/cases");
    expect(screen.getByRole("button", { name: "保存到本机并查看解读" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "上一步" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "返回步骤 1：出生资料" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "保存到本机并查看解读" }));
    fireEvent.submit(view.container.querySelector("form")!);

    expect(create).toHaveBeenCalledTimes(1);
    expect(await caseRepository.listCases()).toHaveLength(1);
    expect(window.location.pathname).toBe("/new");
  });
});
