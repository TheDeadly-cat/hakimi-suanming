import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as bazi from "@hakimi/bazi-core";
import { withTimeRules } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { NewChartPage } from "./new-chart-page";

beforeEach(() => {
  window.history.replaceState({}, "", "/new?demo=1");
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

const examples = [
  { name: "fixed demo", latitude: "39.9042", longitude: "116.4074", edit: false },
  { name: "entered complete pair", latitude: "40.7128", longitude: "-74.006", edit: true },
  { name: "missing longitude", latitude: "39.9042", longitude: "", edit: true },
  { name: "both empty", latitude: "", longitude: "", edit: true }
] as const;

describe("NewChartPage solar preview coordinates", () => {
  it.each(examples)("$name matches actual calculation in both preview steps without applying solar time", async (example) => {
    const latitude = example.latitude === "" ? null : Number(example.latitude);
    const longitude = example.longitude === "" ? null : Number(example.longitude);
    const expected = await bazi.calculateChart({
      schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "北京（演示值）", latitude, longitude, precision: latitude !== null && longitude !== null ? "coordinates" : "city" }, sourceNote: ""
    }, withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" }));
    const calculate = vi.spyOn(bazi, "calculateChart");
    const save = vi.spyOn(caseRepository, "createCase");
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    if (example.edit) {
      fireEvent.change(screen.getByLabelText(/^纬度/), { target: { value: example.latitude } });
      fireEvent.change(screen.getByLabelText(/^经度/), { target: { value: example.longitude } });
    }
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    if (expected.timeCalibration.solarTime) {
      expect(screen.getByText(expected.timeCalibration.solarTime.variants[0]!.meanSolarDateTime)).toBeTruthy();
      expect(screen.getByText(expected.timeCalibration.solarTimePreview!)).toBeTruthy();
    } else {
      const message = example.latitude === "" ? /未提供经纬度/ : /请同时填写纬度和经度/;
      expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("1995-08-18T00:26:00Z")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    if (expected.timeCalibration.solarTimePreview) {
      expect(screen.getByText(`${expected.timeCalibration.solarTimePreview} · 仅对照`)).toBeTruthy();
    }
    await waitFor(() => expect(screen.queryByText("正在核对活动规则包")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "生成命盘" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存并打开" })).toBeTruthy());
    expect(calculate).toHaveBeenCalledTimes(1);
    const actual = await calculate.mock.results[0]!.value;
    expect(actual.timeCalibration.solarTime).toEqual(expected.timeCalibration.solarTime);
    expect(actual.timeCalibration.solarTimePreview).toBe(expected.timeCalibration.solarTimePreview);
    expect(actual.timeCalibration.solarTimeApplied).toBe(false);
    expect(actual.timeCalibration.activeWallTime).toBe("1995-08-18T08:26:00");
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    { label: "latitude", latitude: "91", longitude: "116.4074", field: /^纬度/ },
    { label: "longitude", latitude: "39.9042", longitude: "181", field: /^经度/ }
  ])("invalid $label preserves date parsing and gives an actionable input error", ({ latitude, longitude, field }) => {
    const calculate = vi.spyOn(bazi, "calculateChart");
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByLabelText(/^纬度/), { target: { value: latitude } });
    fireEvent.change(screen.getByLabelText(/^经度/), { target: { value: longitude } });
    expect(screen.getByText("需检查坐标")).toBeTruthy();
    expect(screen.getByText("1995-08-18T00:26:00Z", { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getAllByText(/纬度须在 -90 至 90，经度须在 -180 至 180/).length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(screen.getByLabelText(field));
    expect(screen.queryByText("地方视太阳时")).toBeNull();
    expect(calculate).not.toHaveBeenCalled();
  });
});
