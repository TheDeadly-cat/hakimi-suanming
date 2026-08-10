import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activeRulePackRecordSchema,
  installedRulePackRecordSchema,
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  SCHEMA_VERSION,
  type BirthInput,
  type CaseBundle,
  type LocalAppSettingsRecord,
  type RulePackBinding
} from "@hakimi/contracts";
import { calculateChart, ENGINE } from "@hakimi/bazi-core";
import { withTimeRules } from "@hakimi/rule-profiles";
import { createWorkingDefaultRulePackEnvelope, verifyRulePackIntegrity } from "@hakimi/rule-packs";
import { caseRepository, ruleRegistryRepository } from "@hakimi/storage";
import { LocalAppSettingsProvider, useLocalAppSettings } from "../lib/local-app-settings";
import { NewChartPage } from "./new-chart-page";

const compactLunarSettings: LocalAppSettingsRecord = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
  recordType: "local_app_settings",
  id: LOCAL_APP_SETTINGS_ID,
  locale: "zh-CN",
  defaultTimeZone: "America/New_York",
  defaultCalendarType: "lunar",
  preferredDensity: "compact",
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z"
};

function LocalSettingsReadyProbe() {
  const { ready } = useLocalAppSettings();
  return <span data-testid="local-settings-ready">{ready ? "ready" : "loading"}</span>;
}

const historicalInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "2024-11-03",
  time: "01:30",
  timePrecision: "exact_minute",
  timeZone: "America/New_York",
  sex: "female",
  lunarLeapMonth: false,
  location: { label: "纽约历史地点", latitude: 40.7128, longitude: -74.006, precision: "coordinates" },
  sourceNote: "历史 Revision 来源说明"
};

async function createHistoricalCase(
  alias: string,
  input: BirthInput = historicalInput
): Promise<CaseBundle> {
  const calculated = await calculateChart(input, withTimeRules({ dayBoundary: "midnight", dstAmbiguity: "later" }));
  return caseRepository.createCase({ alias, tags: ["历史", "待复核"], notes: "Case 元数据笔记", calculated });
}

async function createBoundHistoricalCase(): Promise<{ bundle: CaseBundle; binding: RulePackBinding }> {
  const envelope = await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" });
  const verified = await verifyRulePackIntegrity(envelope);
  const binding: RulePackBinding = {
    kind: "installed_rule_pack",
    packDigest: verified.digest,
    profileDigest: verified.profileDigest,
    packId: envelope.metadata.packId,
    profileId: envelope.profile.profileId,
    profileVersion: envelope.profile.profileVersion,
    useMode: "exact"
  };
  const input: BirthInput = {
    ...historicalInput,
    date: "1995-08-18",
    time: "08:26",
    timeZone: "Asia/Shanghai",
    location: { label: "北京历史地点", latitude: 39.9042, longitude: 116.4074, precision: "coordinates" }
  };
  const calculated = await calculateChart(input, envelope.profile, { rulePackBinding: binding });
  const bundle = await caseRepository.createCase({ alias: "规则包历史修订", tags: ["规则包"], calculated });
  return { bundle, binding };
}

describe("NewChartPage 时间校准", () => {
  beforeEach(async () => {
    await caseRepository.clearAll();
    window.history.replaceState({}, "", "/new?demo=1");
    window.scrollTo = vi.fn();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await caseRepository.clearAll();
  });

  function openTimeStep() {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
  }

  function selectLaterNewYorkOverlap() {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByLabelText(/IANA 时区/), { target: { value: "America/New_York" } });
    fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "2024-11-03" } });
    fireEvent.change(screen.getByLabelText(/民用时间/), { target: { value: "01:30" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("radio", { name: /较晚方案/ }));
    expect(screen.getByText("2024-11-03T06:30:00Z")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /上一步/ }));
  }

  it("只给尚未编辑的空白排盘应用保存的默认历法和时区", async () => {
    window.history.replaceState({}, "", "/new");
    const pristineView = render(
      <LocalAppSettingsProvider loadSettings={async () => compactLunarSettings}>
        <LocalSettingsReadyProbe />
        <NewChartPage />
      </LocalAppSettingsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("local-settings-ready").textContent).toBe("ready"));

    fireEvent.change(screen.getByLabelText(/案例别名/), { target: { value: "偏好默认值案例" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByLabelText(/输入历法/)).toHaveProperty("value", "lunar");
    expect(screen.getByLabelText(/IANA 时区/)).toHaveProperty("value", "America/New_York");
    pristineView.unmount();

    let resolveSettings!: (settings: LocalAppSettingsRecord) => void;
    const delayedSettings = new Promise<LocalAppSettingsRecord>((resolve) => {
      resolveSettings = resolve;
    });
    render(
      <LocalAppSettingsProvider loadSettings={() => delayedSettings}>
        <LocalSettingsReadyProbe />
        <NewChartPage />
      </LocalAppSettingsProvider>
    );
    fireEvent.change(screen.getByLabelText(/案例别名/), { target: { value: "已经开始填写的草稿" } });
    await act(async () => resolveSettings(compactLunarSettings));
    await waitFor(() => expect(screen.getByTestId("local-settings-ready").textContent).toBe("ready"));

    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByLabelText(/输入历法/)).toHaveProperty("value", "gregorian");
    expect(screen.getByLabelText(/IANA 时区/)).toHaveProperty("value", "Asia/Shanghai");
  });

  it("保存的默认值不会覆盖固定 demo 输入", async () => {
    render(
      <LocalAppSettingsProvider loadSettings={async () => compactLunarSettings}>
        <LocalSettingsReadyProbe />
        <NewChartPage />
      </LocalAppSettingsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("local-settings-ready").textContent).toBe("ready"));

    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByLabelText(/输入历法/)).toHaveProperty("value", "gregorian");
    expect(screen.getByLabelText(/IANA 时区/)).toHaveProperty("value", "Asia/Shanghai");
    expect(screen.getByLabelText(/出生日期/)).toHaveProperty("value", "1995-08-18");
  });

  it("并列显示原始民用时、UTC 瞬时点与太阳时预览", () => {
    openTimeStep();

    expect(screen.getByText("1995-08-18T00:26:00Z")).toBeTruthy();
    expect(screen.getByText(/Asia\/Shanghai \+08:00/)).toBeTruthy();
    expect(screen.getByText("地方平太阳时")).toBeTruthy();
    expect(screen.getByText("地方视太阳时")).toBeTruthy();
    expect(screen.getAllByText("仅对照").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["推导项目", "当前值", "状态"]);
  });

  it("把向导错误关联到必填字段，并在失败或换步后移动焦点", () => {
    window.history.replaceState({}, "", "/new");
    render(<NewChartPage />);

    const alias = screen.getByLabelText(/案例别名/) as HTMLInputElement;
    expect(alias.required).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(alias.getAttribute("aria-invalid")).toBe("true");
    expect(alias.getAttribute("aria-describedby")).toContain("wizard-error");
    expect(document.activeElement).toBe(alias);

    fireEvent.change(alias, { target: { value: "无障碍测试案例" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    const stageHeading = screen.getByRole("heading", { name: "录入出生资料" });
    expect(document.activeElement).toBe(stageHeading);

    const date = screen.getByLabelText(/出生日期/) as HTMLInputElement;
    const time = screen.getByLabelText(/民用时间/) as HTMLInputElement;
    const timeZone = screen.getByLabelText(/IANA 时区/) as HTMLInputElement;
    expect(date.required).toBe(true);
    expect(time.required).toBe(true);
    expect(timeZone.required).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(date.getAttribute("aria-invalid")).toBe("true");
    expect(date.getAttribute("aria-describedby")).toContain("wizard-error");
    expect(document.activeElement).toBe(date);
  });

  it("逐项标记并聚焦案例元数据与地点标签的长度或标签规则错误", () => {
    render(<NewChartPage />);

    const alias = screen.getByLabelText(/案例别名/) as HTMLInputElement;
    const tags = screen.getByLabelText(/^标签/) as HTMLInputElement;
    const sourceNote = screen.getByLabelText(/资料来源说明/) as HTMLTextAreaElement;
    fireEvent.change(alias, { target: { value: "案".repeat(81) } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(alias.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(alias);

    fireEvent.change(alias, { target: { value: "边界测试案例" } });
    fireEvent.change(tags, { target: { value: "重复,重复" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(tags.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(tags);

    fireEvent.change(tags, { target: { value: "边界" } });
    fireEvent.change(sourceNote, { target: { value: "源".repeat(501) } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(sourceNote.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(sourceNote);

    fireEvent.change(sourceNote, { target: { value: "来源已复核" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    const locationLabel = screen.getByLabelText(/地点标签/) as HTMLInputElement;
    fireEvent.change(locationLabel, { target: { value: "地".repeat(81) } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(locationLabel.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(locationLabel);
    expect((screen.getByLabelText(/出生日期/) as HTMLInputElement).getAttribute("aria-invalid")).toBeNull();
  });

  it("支持农历输入并显式展示转换后的公历日期", () => {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByRole("combobox", { name: /输入历法/ }), { target: { value: "lunar" } });

    const lunarDate = screen.getByLabelText(/农历日期/);
    expect(lunarDate).toHaveProperty("value", "");
    fireEvent.change(lunarDate, { target: { value: "1995-07-23" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));

    expect(screen.getByText("1995-08-18", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText("显式转换")).toBeTruthy();
    expect(screen.getByText("1995-08-18T00:26:00Z")).toBeTruthy();
    expect(screen.getByText(/原始农历输入 1995-07-23/)).toBeTruthy();
  });

  it("切换到秒级时补齐零秒，切回分钟时不静默截断非零秒", () => {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));

    const precision = screen.getByRole("combobox", { name: /时间精度/ });
    const civilTime = screen.getByLabelText(/民用时间/);
    fireEvent.change(precision, { target: { value: "exact_second" } });

    expect(civilTime).toHaveProperty("value", "08:26:00");
    expect(civilTime.getAttribute("step")).toBe("1");

    fireEvent.change(civilTime, { target: { value: "08:26:07" } });
    fireEvent.change(precision, { target: { value: "exact_minute" } });
    expect(civilTime).toHaveProperty("value", "");
  });

  it("在 DST 重叠时要求显式选择，reject 不伪造活动瞬时点", () => {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByLabelText(/IANA 时区/), { target: { value: "America/New_York" } });
    fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "2024-11-03" } });
    fireEvent.change(screen.getByLabelText(/民用时间/), { target: { value: "01:30" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));

    expect(screen.getByRole("group", { name: "DST 重叠处理" })).toBeTruthy();
    expect(screen.getByText("未选择有效瞬时点")).toBeTruthy();
    expect(screen.getByText(/2024-11-03T05:30:00Z/)).toBeTruthy();
    expect(screen.getByText(/2024-11-03T06:30:00Z/)).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: /较晚方案/ }));
    expect(screen.getByText("2024-11-03T06:30:00Z")).toBeTruthy();
    expect(screen.getByText(/America\/New_York -05:00/)).toBeTruthy();
  });

  it.each([
    ["出生日期", () => fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "2023-11-05" } })],
    ["民用时间", () => fireEvent.change(screen.getByLabelText(/民用时间/), { target: { value: "01:45" } })],
    ["IANA 时区", () => fireEvent.change(screen.getByLabelText(/IANA 时区/), { target: { value: "America/Toronto" } })],
    ["时间精度", () => fireEvent.change(screen.getByRole("combobox", { name: /时间精度/ }), { target: { value: "exact_second" } })],
    ["输入历法", () => {
      fireEvent.change(screen.getByRole("combobox", { name: /输入历法/ }), { target: { value: "lunar" } });
      fireEvent.change(screen.getByLabelText(/农历日期/), { target: { value: "2024-10-03" } });
    }]
  ])("修改%s后必须重新选择 DST 重叠方案", (_field, changeField) => {
    selectLaterNewYorkOverlap();

    changeField();
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));

    expect(screen.getByRole("radio", { name: /先不选择/ })).toHaveProperty("checked", true);
    expect(screen.getByText("未选择有效瞬时点")).toBeTruthy();
  });

  it("未知时辰保留原事实，生成并保存独立的 13 探针候选组", async () => {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByRole("combobox", { name: /时间精度/ }), { target: { value: "unknown_hour" } });
    expect(screen.getByLabelText(/民用时间/)).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByText("未知时辰候选入口")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成 13 个候选" }));

    expect(await screen.findByRole("heading", { name: "13 个代表性候选" })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(13);
    expect(screen.getByText(/独立 CandidateSetRecord/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "保存并打开候选组" }));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/candidate-sets\/[0-9a-f-]+$/));

    const records = await caseRepository.listCandidateSets();
    expect(records).toHaveLength(1);
    expect(records[0].alias).toBe("演示案例 · 辰时研究");
    expect(records[0].candidateSet.input.time).toBeNull();
    expect(records[0].candidateSet.input.timePrecision).toBe("unknown_hour");
    expect(records[0].candidateSet.candidates).toHaveLength(13);
  });

  it("未知时辰遇到 DST 重叠时并列显示 earlier/later 两张变体", async () => {
    render(<NewChartPage />);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.change(screen.getByRole("combobox", { name: /时间精度/ }), { target: { value: "unknown_hour" } });
    fireEvent.change(screen.getByLabelText(/IANA 时区/), { target: { value: "Australia/Lord_Howe" } });
    fireEvent.change(screen.getByLabelText(/出生日期/), { target: { value: "2024-04-07" } });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成 13 个候选" }));

    expect(await screen.findByText("2 个 DST 变体")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("earlier · +11:00") === true)).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("later · +10:30") === true)).toBeTruthy();
  });

  it("用活动规则包的精确 profile 计算，并把包摘要写入新 Revision", async () => {
    const envelope = await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" });
    const verified = await verifyRulePackIntegrity(envelope);
    const importedAt = new Date().toISOString();
    await ruleRegistryRepository.installRulePack(installedRulePackRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 1,
      recordType: "installed_rule_pack",
      id: verified.digest,
      packDigest: verified.digest,
      profileDigest: verified.profileDigest,
      packId: envelope.metadata.packId,
      profileId: envelope.profile.profileId,
      profileVersion: envelope.profile.profileVersion,
      canonicalJson: verified.canonicalJson,
      localTrust: "unverified_local_import",
      importedAt
    }));
    await ruleRegistryRepository.activateRulePack(activeRulePackRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 1,
      recordType: "active_rule_pack",
      id: "active-rule-pack",
      activeDigest: verified.digest,
      activeProfileDigest: verified.profileDigest,
      activatedAt: importedAt,
      approval: {
        status: "locally_approved_for_activation",
        acknowledgedAt: importedAt,
        acknowledgementVersion: "rule-pack-local-approval@1",
        appVersion: "0.2.0-p0",
        engineName: ENGINE.name,
        engineVersion: ENGINE.version
      }
    }));
    const createCase = vi.spyOn(caseRepository, "createCase");

    render(<NewChartPage />);
    expect(await screen.findByText(/活动规则包：传统子平工作默认规则包/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByRole("radio", { name: /23:00 子初换日/ })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成命盘" }));
    await screen.findByRole("heading", { name: "四柱候选结果" });
    fireEvent.click(screen.getByRole("button", { name: "保存并打开" }));

    await waitFor(() => expect(createCase).toHaveBeenCalledTimes(1));
    const calculated = createCase.mock.calls[0]?.[0].calculated;
    expect(calculated.rulePackBinding).toMatchObject({
      packDigest: verified.digest,
      profileDigest: verified.profileDigest,
      useMode: "exact"
    });
    expect(calculated.manifest.ruleProfileDigest).toBe(verified.profileDigest);
  });

  it("从精确历史 Revision 预填 input、timeCalibration 与 ruleProfile，并锁定 Case 元数据", async () => {
    const bundle = await createHistoricalCase("历史派生案例");
    const revision = bundle.revisions[0];

    render(
      <LocalAppSettingsProvider loadSettings={async () => compactLunarSettings}>
        <NewChartPage caseId={bundle.caseRecord.id} revisionId={revision.id} />
      </LocalAppSettingsProvider>
    );

    expect(await screen.findByRole("heading", { name: "由历史修订派生新版" })).toBeTruthy();
    expect(screen.getByLabelText(/案例别名/)).toHaveProperty("value", "历史派生案例");
    expect(screen.getByLabelText(/案例别名/)).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/^标签/)).toHaveProperty("value", "历史, 待复核");
    expect(screen.getByLabelText(/^标签/)).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/资料来源说明/)).toHaveProperty("value", historicalInput.sourceNote);
    expect(screen.getByText(revision.ruleProfile.profileId)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByLabelText(/输入历法/)).toHaveProperty("value", historicalInput.calendarType);
    expect(screen.getByLabelText(/出生日期/)).toHaveProperty("value", historicalInput.date);
    expect(screen.getByLabelText(/民用时间/)).toHaveProperty("value", historicalInput.time);
    expect(screen.getByLabelText(/IANA 时区/)).toHaveProperty("value", historicalInput.timeZone);
    expect(screen.getByRole("option", { name: /未知时辰/ })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    expect(screen.getByRole("radio", { name: /00:00 午夜换日/ })).toHaveProperty("checked", true);
    expect(screen.getByRole("radio", { name: /较晚方案/ })).toHaveProperty("checked", true);
  });

  it("历史 Revision 的规则快照未改变时沿用精确规则包绑定", async () => {
    const { bundle, binding } = await createBoundHistoricalCase();
    const revision = bundle.revisions[0];
    const addRevision = vi.spyOn(caseRepository, "addRevision");

    render(<NewChartPage caseId={bundle.caseRecord.id} revisionId={revision.id} />);
    await screen.findByRole("heading", { name: "由历史修订派生新版" });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成命盘" }));
    await screen.findByRole("heading", { name: "四柱候选结果" });
    fireEvent.click(screen.getByRole("button", { name: "保存为新修订并打开" }));

    await waitFor(() => expect(addRevision).toHaveBeenCalledTimes(1));
    expect(addRevision.mock.calls[0]?.[1].rulePackBinding).toEqual(binding);
    const stored = await caseRepository.getCase(bundle.caseRecord.id);
    expect(stored?.revisions.at(-1)?.rulePackBinding).toEqual(binding);
  });

  it("历史 Revision 显式改变规则后不冒充原规则包绑定", async () => {
    const { bundle } = await createBoundHistoricalCase();
    const revision = bundle.revisions[0];
    const addRevision = vi.spyOn(caseRepository, "addRevision");

    render(<NewChartPage caseId={bundle.caseRecord.id} revisionId={revision.id} />);
    await screen.findByRole("heading", { name: "由历史修订派生新版" });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("radio", { name: /00:00 午夜换日/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成命盘" }));
    await screen.findByRole("heading", { name: "四柱候选结果" });
    fireEvent.click(screen.getByRole("button", { name: "保存为新修订并打开" }));

    await waitFor(() => expect(addRevision).toHaveBeenCalledTimes(1));
    expect(addRevision.mock.calls[0]?.[1].rulePackBinding).toBeUndefined();
  });

  it("拒绝 URL 中不属于当前 Case 的 Revision", async () => {
    const first = await createHistoricalCase("案例甲");
    const second = await createHistoricalCase("案例乙", { ...historicalInput, date: "2024-11-04", time: "02:30" });

    render(<NewChartPage caseId={first.caseRecord.id} revisionId={second.revisions[0].id} />);

    expect((await screen.findByRole("alert")).textContent).toContain("指定 Revision 不属于当前 Case");
    expect(screen.queryByRole("heading", { name: "由历史修订派生新版" })).toBeNull();
  });

  it("拒绝从回收站 Case 派生 Revision", async () => {
    const bundle = await createHistoricalCase("回收站案例");
    await caseRepository.trashCase(bundle.caseRecord.id);

    render(<NewChartPage caseId={bundle.caseRecord.id} revisionId={bundle.revisions[0].id} />);

    expect((await screen.findByRole("alert")).textContent).toContain("此案例已在回收站");
    expect(screen.queryByRole("button", { name: /生成命盘/ })).toBeNull();
  });

  it("可从非最新历史 Revision 派生 Rn，只追加并打开精确新深链", async () => {
    const original = await createHistoricalCase("只追加修订");
    const beforeDerive = await caseRepository.addRevision(
      original.caseRecord.id,
      await calculateChart(
        { ...historicalInput, date: "2024-11-04", time: "02:30" },
        withTimeRules({ dayBoundary: "zi_start_23", dstAmbiguity: "require_user" })
      )
    );
    const addRevision = vi.spyOn(caseRepository, "addRevision");
    render(<NewChartPage caseId={original.caseRecord.id} revisionId={original.revisions[0].id} />);

    await screen.findByRole("heading", { name: "由历史修订派生新版" });
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: /下一步/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成命盘" }));
    await screen.findByRole("heading", { name: "四柱候选结果" });
    fireEvent.click(screen.getByRole("button", { name: "保存为新修订并打开" }));

    await waitFor(() => expect(addRevision).toHaveBeenCalledTimes(1));
    const stored = await caseRepository.getCase(original.caseRecord.id);
    expect(stored?.revisions).toHaveLength(3);
    expect(stored?.revisions[0]).toEqual(original.revisions[0]);
    expect(stored?.revisions[1]).toEqual(beforeDerive.revisions[1]);
    expect(stored?.revisions[2].input).toEqual(original.revisions[0].input);
    expect(stored?.caseRecord.alias).toBe(original.caseRecord.alias);
    expect(stored?.caseRecord.tags).toEqual(original.caseRecord.tags);
    expect(window.location.pathname).toBe(`/cases/${original.caseRecord.id}/revisions/${stored?.caseRecord.latestRevisionId}`);
  });
});
