import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  eventRecordSchema,
  type BirthInput,
  type CaseRecord,
  type RevisionRecord,
  type RulePackBinding
} from "@hakimi/contracts";
import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { ChartPage, LuckCyclePanel, PillarRelationsPanel } from "./chart-page";

beforeEach(() => {
  document.documentElement.dataset.appBootReady = "true";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.appBootReady;
  window.history.replaceState({}, "", "/");
});

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

async function revisionFor(birth: BirthInput, rulePackBinding?: RulePackBinding): Promise<RevisionRecord> {
  const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE, { rulePackBinding });
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    facts: chart.facts,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    manifest: chart.manifest
  };
}

async function testRulePackBinding(): Promise<RulePackBinding> {
  return {
    kind: "installed_rule_pack",
    packDigest: "a".repeat(64),
    profileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
    packId: "chart-page-test-pack",
    profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
    profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
    useMode: "exact"
  };
}

describe("LuckCyclePanel", () => {
  it("显示可审计起运事实与十个半开大运区间，不输出断语", async () => {
    render(<LuckCyclePanel revision={await revisionFor(input)} />);

    expect(screen.getByRole("heading", { name: "起运与十柱大运" })).toBeTruthy();
    expect(screen.getByText(/逆行 · 乙阴年干/)).toBeTruthy();
    expect(screen.getByText(/未舍入/)).toBeTruthy();
    const track = screen.getByRole("list", { name: "十柱大运半开区间" });
    expect(within(track).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText(/不输出吉凶、旺衰或事件预测/)).toBeTruthy();
  });

  it("性别未指定时要求人工方向，不静默猜测", async () => {
    render(<LuckCyclePanel revision={await revisionFor({ ...input, sex: "unspecified" })} />);

    expect(screen.getByText("性别未指定，不能静默决定顺逆")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "十柱大运半开区间" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "人工指定顺行" }));
    expect(screen.getByText(/顺行 · 乙阴年干/)).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "十柱大运半开区间" })).getAllByRole("listitem")).toHaveLength(10);
  });
});

describe("PillarRelationsPanel", () => {
  it("只显示版本化干支关系事实，并保留完整度与待复核状态", async () => {
    const revision = await revisionFor(input);
    const expected = calculatePillarRelations(revision.facts);
    render(<PillarRelationsPanel revision={revision} />);

    expect(screen.getByRole("heading", { name: "干支关系事实" })).toBeTruthy();
    const list = screen.getByRole("list", { name: "干支关系事实列表" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(expected.facts.length);
    expect(screen.getByText(/不判断合化、力量或吉凶/)).toBeTruthy();
    expect(screen.getAllByText(/待顾问/).length).toBeGreaterThan(0);
  });
});

describe("ChartPage transit route", () => {
  it("显示规则包、Profile 与双摘要的精确绑定来源", async () => {
    const binding = await testRulePackBinding();
    const revision = await revisionFor(input, binding);
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: revision.caseId,
      alias: "规则包来源案例",
      tags: [],
      notes: "",
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt,
      latestRevisionId: revision.id,
      revisionCount: 1,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([]);
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([]);
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${revision.id}?view=research`);

    render(<ChartPage caseId={caseRecord.id} revisionId={revision.id} />);

    expect(await screen.findByRole("heading", { name: "复算元数据" })).toBeTruthy();
    expect(screen.getByText(binding.packId)).toBeTruthy();
    expect(screen.getByText(binding.packDigest)).toBeTruthy();
    expect(screen.getByText(`${binding.profileId}@${binding.profileVersion} · 精确使用`)).toBeTruthy();
    expect(screen.getAllByText(binding.profileDigest).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("未绑定安装包 · 内置或派生规则快照")).toBeNull();
  });

  it("在研读页运行本命盘只读复演且不写入新 Revision", async () => {
    const revision = await revisionFor(input);
    const revisionBefore = structuredClone(revision);
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: revision.caseId,
      alias: "只读复演案例",
      tags: [],
      notes: "",
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt,
      latestRevisionId: revision.id,
      revisionCount: 1,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([]);
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([]);
    const addRevision = vi.spyOn(caseRepository, "addRevision");
    const listReceipts = vi.spyOn(caseRepository, "listRevisionCalculationReceipts");
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${revision.id}?view=research`);

    render(<ChartPage caseId={caseRecord.id} revisionId={revision.id} />);

    expect(await screen.findByRole("heading", { name: "本命盘只读复演" })).toBeTruthy();
    const replayButton = await screen.findByRole("button", { name: "运行本命盘只读复演" });
    fireEvent.click(replayButton);
    expect(await screen.findByText("冻结结果与精确执行器复演一致", {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.getByText(/源 Revision 未改写/)).toBeTruthy();
    expect(addRevision).not.toHaveBeenCalled();
    expect(listReceipts).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "历史计算收据" })).toBeNull();
    expect(revision).toEqual(revisionBefore);
  }, 15_000);

  it("刷新可恢复运限视图，并把所选节点带到研读事件表单", async () => {
    const revision = await revisionFor(input);
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: revision.caseId,
      alias: "运限路由案例",
      tags: [],
      notes: "",
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt,
      latestRevisionId: revision.id,
      revisionCount: 1,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([]);
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([]);
    const pathname = `/cases/${caseRecord.id}/revisions/${revision.id}`;
    window.history.replaceState({}, "", `${pathname}?view=transit&at=2026-08-01T12%3A00%3A00Z&scale=day&track=year&track=month`);

    render(<ChartPage caseId={caseRecord.id} revisionId={revision.id} />);

    expect(await screen.findByRole("heading", { name: "同一瞬时点的六层运限切片" })).toBeTruthy();
    const researchHref = new URL(screen.getByRole("link", { name: "研读" }).getAttribute("href")!, "https://hakimi.test");
    expect(researchHref.searchParams.get("scale")).toBe("day");
    expect(researchHref.searchParams.getAll("track")).toEqual(["year", "month"]);
    const yearSection = (await screen.findByRole("heading", { name: "流年" })).closest("section");
    fireEvent.click(within(yearSection!).getAllByRole("button")[0]);
    await waitFor(() => expect(window.location.search).toContain("node=year%3A"));

    fireEvent.click(screen.getByRole("button", { name: "到研读页记录事件" }));
    expect(await screen.findByText(/绑定所选year节点/)).toBeTruthy();
    const researchParams = new URLSearchParams(window.location.search);
    expect(researchParams.get("scale")).toBe("day");
    expect(researchParams.getAll("track")).toEqual(["year", "month"]);

  });

  it("切换历史 Revision 时保留 view、at、scale 与 tracks，并清除 node、dir 和未知 query", async () => {
    const first = await revisionFor(input);
    const secondCalculated = await calculateChart({ ...input, date: "1995-08-19" }, WORKING_DEFAULT_RULE_PROFILE);
    const second: RevisionRecord = {
      schemaVersion: "1.0.0",
      id: "33333333-3333-4333-8333-333333333333",
      caseId: first.caseId,
      revisionNumber: 2,
      createdAt: "2026-08-02T00:00:00.000Z",
      input: secondCalculated.input,
      timeCalibration: secondCalculated.timeCalibration,
      ruleProfile: secondCalculated.ruleProfile,
      facts: secondCalculated.facts,
      luckCycleRuleSnapshot: secondCalculated.luckCycleRuleSnapshot,
      manifest: secondCalculated.manifest
    };
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: first.caseId,
      alias: "历史切换案例",
      tags: [],
      notes: "",
      createdAt: first.createdAt,
      updatedAt: second.createdAt,
      latestRevisionId: second.id,
      revisionCount: 2,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [first, second] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([]);
    const node = `year:1.${"a".repeat(64)}`;
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${first.id}?view=transit&at=2026-08-01T12%3A00%3A00Z&node=${encodeURIComponent(node)}&dir=forward&scale=hour&track=year&track=hour&unsafe=1`);

    render(<ChartPage caseId={caseRecord.id} revisionId={first.id} />);

    const history = await screen.findByRole("combobox", { name: "历史 Revision" });
    fireEvent.change(history, { target: { value: second.id } });

    expect(window.location.pathname).toBe(`/cases/${caseRecord.id}/revisions/${second.id}`);
    const params = new URLSearchParams(window.location.search);
    expect(params.get("view")).toBe("transit");
    expect(params.get("at")).toBe("2026-08-01T12:00:00Z");
    expect(params.get("scale")).toBe("hour");
    expect(params.getAll("track")).toEqual(["year", "hour"]);
    expect(params.has("node")).toBe(false);
    expect(params.has("dir")).toBe(false);
    expect(params.has("unsafe")).toBe(false);
  });

  it("research 事件 UUID 只在同案例同修订精确命中，并将卡片聚焦", async () => {
    const revision = await revisionFor(input);
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: revision.caseId,
      alias: "事件深链案例",
      tags: [],
      notes: "",
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt,
      latestRevisionId: revision.id,
      revisionCount: 1,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    const record = eventRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      caseId: caseRecord.id,
      revisionId: revision.id,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2026-08-01",
      endDate: null,
      title: "深链精确事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      bodyFormat: "markdown",
      body: "",
      timeContext: { kind: "calendar_date" },
      deletedAt: null,
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt
    });
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([record]);
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([]);
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${revision.id}?view=research&event=${record.id}`);

    render(<ChartPage caseId={caseRecord.id} revisionId={revision.id} />);

    const card = await screen.findByRole("article", { name: "事件 深链精确事件" });
    expect(screen.getByText("未绑定安装包 · 内置或派生规则快照")).toBeTruthy();
    expect(card.classList.contains("event-card--selected")).toBe(true);
    expect(screen.getByText("深链定位")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(card));
    expect(screen.queryByRole("alert", { name: /无法定位事件/ })).toBeNull();
  });

  it("跨修订事件深链给出告警且绝不回退到近似事件", async () => {
    const first = await revisionFor(input);
    const second: RevisionRecord = { ...first, id: "33333333-3333-4333-8333-333333333333", revisionNumber: 2 };
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: first.caseId,
      alias: "跨修订事件",
      tags: [],
      notes: "",
      createdAt: first.createdAt,
      updatedAt: first.createdAt,
      latestRevisionId: second.id,
      revisionCount: 2,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    };
    const record = eventRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      caseId: caseRecord.id,
      revisionId: second.id,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2026-08-02",
      endDate: null,
      title: "其他修订事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      bodyFormat: "markdown",
      body: "",
      timeContext: { kind: "calendar_date" },
      deletedAt: null,
      createdAt: first.createdAt,
      updatedAt: first.createdAt
    });
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [first, second] });
    vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([record]);
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([]);
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${first.id}?view=research&event=${record.id}`);

    render(<ChartPage caseId={caseRecord.id} revisionId={first.id} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("属于其他 Revision");
    expect(alert.textContent).toContain("不会在当前修订近似定位");
    expect(document.querySelector(".event-card--selected")).toBeNull();
  });

  it("回收站案例显示只读状态并禁用派生入口", async () => {
    const revision = await revisionFor(input);
    const caseRecord: CaseRecord = {
      schemaVersion: "1.0.0",
      id: revision.caseId,
      alias: "回收站命盘",
      tags: [],
      notes: "",
      createdAt: revision.createdAt,
      updatedAt: revision.createdAt,
      latestRevisionId: revision.id,
      revisionCount: 1,
      recordVersion: 2,
      favorite: false,
      deletedAt: revision.createdAt
    };
    vi.spyOn(caseRepository, "getCase").mockResolvedValue({ caseRecord, revisions: [revision] });
    window.history.replaceState({}, "", `/cases/${caseRecord.id}/revisions/${revision.id}`);

    render(<ChartPage caseId={caseRecord.id} revisionId={revision.id} />);

    expect(await screen.findByText("案例已在回收站")).toBeTruthy();
    expect(screen.getByRole("button", { name: "由此修订派生新版" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("link", { name: "由此修订派生新版" })).toBeNull();
  });
});
