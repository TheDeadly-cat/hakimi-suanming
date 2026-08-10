import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BirthInput,
  CandidateSetRecord,
  LegacyTzdbMigrationReceipt,
  RulePackBinding,
  UnknownHourCandidateResult
} from "@hakimi/contracts";
import { calculateUnknownHourCandidates, digestRuleProfile } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import { CandidateSetPage } from "./candidate-set-page";

const { saveTextFileMock } = vi.hoisted(() => ({
  saveTextFileMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  saveTextFile: saveTextFileMock
}));

const loadingCandidateSetId = "11111111-1111-4111-8111-111111111111";
const unknownHourInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "2024-04-07",
  time: null,
  timePrecision: "unknown_hour",
  timeZone: "Australia/Lord_Howe",
  sex: "unspecified",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "DST 重叠保真测试"
};

const casablancaUnknownHourInput: BirthInput = {
  ...unknownHourInput,
  date: "2026-10-01",
  timeZone: "Africa/Casablanca",
  sourceNote: "IANA 2025b/2026c 并列复算"
};

let candidateSet: UnknownHourCandidateResult;

beforeAll(async () => {
  candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
});

beforeEach(async () => {
  await caseRepository.clearAll();
  saveTextFileMock.mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
});

async function storeCandidateSet(): Promise<CandidateSetRecord> {
  return caseRepository.createCandidateSet({
    alias: "时辰待考 · Lord Howe",
    tags: ["未知时辰", "DST"],
    notes: "只读候选组",
    candidateSet
  });
}

function asLegacyCandidateSet(record: CandidateSetRecord): CandidateSetRecord {
  const { timeZoneDatabase: _timeZoneDatabase, ...legacyCandidateSet } = record.candidateSet;
  return {
    ...record,
    alias: `${record.alias} · 旧 tzdb`,
    snapshotDigest: "a".repeat(64),
    candidateSet: {
      ...legacyCandidateSet,
      hashSchemaVersion: "1.0.0",
      tzdbVersion: "browser-intl-unreported",
      resultHash: "b".repeat(64)
    }
  };
}

function makeMigrationReceipt(source: CandidateSetRecord, target: CandidateSetRecord): LegacyTzdbMigrationReceipt {
  const probeDiffs = target.candidateSet.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    sourceStatus: candidate.status,
    targetStatus: candidate.status,
    behaviorChanged: false,
    hashChanged: true,
    changedFields: []
  }));
  return {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    id: "33333333-3333-4333-8333-333333333333",
    operation: "candidate_set_tzdb_recalculation",
    source: {
      kind: "candidate_set",
      recordId: source.id,
      snapshotDigest: source.snapshotDigest,
      resultHash: source.candidateSet.resultHash,
      tzdbVersion: source.candidateSet.tzdbVersion
    },
    target: {
      kind: "candidate_set",
      recordId: target.id,
      snapshotDigest: target.snapshotDigest,
      resultHash: target.candidateSet.resultHash,
      tzdbVersion: target.candidateSet.tzdbVersion
    },
    comparison: {
      formatVersion: "1.0.0",
      source: {
        tzdbVersion: source.candidateSet.tzdbVersion,
        resultHash: source.candidateSet.resultHash
      },
      target: {
        tzdbVersion: target.candidateSet.tzdbVersion,
        resultHash: target.candidateSet.resultHash
      },
      probeDiffs,
      behaviorChangedCount: 0,
      hashOnlyChangedCount: 13,
      unchangedCount: 0
    },
    comparisonDigest: "d".repeat(64),
    createdAt: "2026-08-02T08:00:00.000Z"
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  saveTextFileMock.mockReset();
  window.history.replaceState({}, "", "/");
  await caseRepository.clearAll();
});

describe("CandidateSetPage", () => {
  it("等待存储层返回时显示明确的加载状态", () => {
    vi.spyOn(caseRepository, "getCandidateSet").mockImplementation(() => new Promise(() => undefined));

    render(<CandidateSetPage candidateSetId={loadingCandidateSetId} />);

    expect(screen.getByRole("heading", { name: "正在读取候选组" })).toBeTruthy();
    expect(screen.getByRole("status", { name: "正在读取未知时辰候选组" })).toBeTruthy();
  });

  it("完整展示 13 个并列探针和全部 DST 变体，不提供主盘选择", async () => {
    const record = await storeCandidateSet();
    const getCandidateSet = vi.spyOn(caseRepository, "getCandidateSet");

    render(<CandidateSetPage candidateSetId={record.id} />);

    expect(await screen.findByRole("heading", { name: record.alias })).toBeTruthy();
    expect(getCandidateSet).toHaveBeenCalledOnce();
    expect(getCandidateSet).toHaveBeenCalledWith(record.id);
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("time = null") === true)).toBeTruthy();
    expect(screen.getByText("unknown_hour", { selector: "code" })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(13);
    expect(screen.getByText("2 个 DST 变体")).toBeTruthy();

    const overlapProbe = screen.getByText("2 个 DST 变体").closest("article");
    expect(overlapProbe).not.toBeNull();
    const variants = within(overlapProbe!).getByRole("list", { name: /全部时间变体/ });
    expect(within(variants).getAllByRole("listitem")).toHaveLength(2);
    expect(within(variants).getByText("DST earlier")).toBeTruthy();
    expect(within(variants).getByText("DST later")).toBeTruthy();
    expect(screen.getByText("不选主盘")).toBeTruthy();
    expect(screen.getByText("未绑定安装包 · 内置或派生规则快照")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /主盘/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "候选组研究记录" })).toBeTruthy();
    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    expect(screen.getByLabelText(/Markdown 笔记/)).toBeTruthy();
  });

  it("只按唯一完整 event UUID 精确定位候选组事件", async () => {
    const record = await storeCandidateSet();
    const selected = await researchRepository.createEvent({
      caseId: record.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2026-08-01",
      endDate: null,
      title: "精确深链事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "只允许 UUID 精确命中。"
    });
    window.history.replaceState({}, "", `/candidate-sets/${record.id}?event=${selected.id.toUpperCase()}`);

    render(<CandidateSetPage candidateSetId={record.id} />);

    const card = await screen.findByRole(
      "article",
      { name: "事件 精确深链事件" },
      { timeout: 5_000 }
    );
    expect(within(card).getByText("深链定位")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(card), { timeout: 5_000 });
  });

  it("拒绝无效或重复 event 参数，且不改用近似事件", async () => {
    const record = await storeCandidateSet();
    await researchRepository.createEvent({
      caseId: record.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2026-08-01",
      endDate: null,
      title: "不应被近似命中",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "参数错误时不选择任何事件。"
    });
    window.history.replaceState({}, "", `/candidate-sets/${record.id}?event=not-a-uuid&event=also-invalid`);

    render(<CandidateSetPage candidateSetId={record.id} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("无法定位事件")).toBeTruthy();
    expect(within(alert).getByText("event 参数必须是唯一、完整的事件 UUID；没有改用近似事件。")).toBeTruthy();
    expect(screen.queryByText(/深链定位/)).toBeNull();
  });

  it("完整显示未知时辰候选组的规则包与 Profile 双摘要绑定", async () => {
    const binding: RulePackBinding = {
      kind: "installed_rule_pack",
      packDigest: "b".repeat(64),
      profileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
      packId: "candidate-page-test-pack",
      profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
      profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
      useMode: "exact"
    };
    const boundCandidateSet = await calculateUnknownHourCandidates(
      unknownHourInput,
      WORKING_DEFAULT_RULE_PROFILE,
      { rulePackBinding: binding }
    );
    const record = await caseRepository.createCandidateSet({
      alias: "规则包候选组",
      tags: [],
      notes: "",
      candidateSet: boundCandidateSet
    });

    render(<CandidateSetPage candidateSetId={record.id} />);

    expect(await screen.findByRole("heading", { name: record.alias })).toBeTruthy();
    expect(screen.getByText(binding.packId)).toBeTruthy();
    expect(screen.getByText(binding.packDigest)).toBeTruthy();
    expect(screen.getByText(`${binding.profileId}@${binding.profileVersion} · 精确使用`)).toBeTruthy();
    expect(screen.getAllByText(binding.profileDigest).length).toBeGreaterThanOrEqual(2);
  });

  it("未识别旧 tzdb 必须确认后才按当前随包快照生成并列候选组", async () => {
    const storedSource = await storeCandidateSet();
    const source = asLegacyCandidateSet(storedSource);
    const target = await storeCandidateSet();
    const receipt = makeMigrationReceipt(source, target);
    type DeriveResult = Awaited<ReturnType<typeof caseRepository.deriveCandidateSetTzdbSnapshot>>;
    let resolveDerivation!: (result: DeriveResult) => void;
    const pendingDerivation = new Promise<DeriveResult>((resolve) => {
      resolveDerivation = resolve;
    });
    vi.spyOn(caseRepository, "getCandidateSet").mockResolvedValue(source);
    vi.spyOn(caseRepository, "listTzdbMigrationReceiptsForCandidateSet").mockResolvedValue([]);
    const derive = vi.spyOn(caseRepository, "deriveCandidateSetTzdbSnapshot").mockReturnValue(pendingDerivation);

    render(<CandidateSetPage candidateSetId={source.id} />);

    expect(await screen.findByRole("heading", { name: "时区快照并列复算" })).toBeTruthy();
    expect(screen.getByText(/基准记录保持只读/)).toBeTruthy();
    expect(screen.getByText(/不是原历史 App 的运行结果/)).toBeTruthy();
    const confirm = screen.getByRole("checkbox", { name: /按目标快照生成并列候选组/ });
    const action = screen.getByRole("button", { name: "按 IANA 2026c 并列复算" });
    expect(action.hasAttribute("disabled")).toBe(true);
    expect(derive).not.toHaveBeenCalled();

    fireEvent.click(confirm);
    expect(action.hasAttribute("disabled")).toBe(false);
    fireEvent.click(action);

    expect(await screen.findByRole("status", { name: /正在按目标固定 tzdb 并列复算全部 13 个探针/ })).toBeTruthy();
    await waitFor(() => expect(derive).toHaveBeenCalledTimes(1));
    const request = derive.mock.calls[0]?.[0];
    expect(request?.sourceCandidateSetId).toBe(source.id);
    expect(request?.expectedSourceSnapshotDigest).toBe(source.snapshotDigest);
    expect(request?.expectedTargetSnapshotId).toBe(RUNTIME_TZDB_VERSION);
    expect(request?.candidateSet.tzdbVersion).toBe(RUNTIME_TZDB_VERSION);
    expect(request?.candidateSet.candidates).toHaveLength(13);

    resolveDerivation({ source, target, receipt });
    expect(await screen.findByText("并列候选组和可核验凭证已生成，基准记录未改写")).toBeTruthy();
    expect(screen.getByRole("link", { name: /打开并列候选组/ }).getAttribute("href")).toBe(`/candidate-sets/${target.id}`);
    expect(await screen.findByRole("heading", { name: "并列复算目标" })).toBeTruthy();
  });

  it("tzdb 派生失败时保留源记录并显示明确错误", async () => {
    const source = asLegacyCandidateSet(await storeCandidateSet());
    vi.spyOn(caseRepository, "getCandidateSet").mockResolvedValue(source);
    vi.spyOn(caseRepository, "listTzdbMigrationReceiptsForCandidateSet").mockResolvedValue([]);
    vi.spyOn(caseRepository, "deriveCandidateSetTzdbSnapshot").mockRejectedValue(new Error("源快照摘要已经变化"));

    render(<CandidateSetPage candidateSetId={source.id} />);

    fireEvent.click(await screen.findByRole("checkbox", { name: /按目标快照生成并列候选组/ }));
    fireEvent.click(screen.getByRole("button", { name: "按 IANA 2026c 并列复算" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("没有生成并列候选组")).toBeTruthy();
    expect(within(alert).getByText("源快照摘要已经变化")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /打开并列候选组/ })).toBeNull();
  });

  it("历史凭证的目标不是当前运行时 tzdb 时仍允许再次显式派生", async () => {
    const source = asLegacyCandidateSet(await storeCandidateSet());
    const previousTarget = await storeCandidateSet();
    const previousReceipt = makeMigrationReceipt(source, previousTarget);
    const previousTzdbVersion = RUNTIME_TZDB_VERSION.replace(
      /^iana-tzdb@\d{4}[a-z]/,
      "iana-tzdb@1900a"
    );
    expect(previousTzdbVersion).not.toBe(RUNTIME_TZDB_VERSION);
    const historicalReceipt: LegacyTzdbMigrationReceipt = {
      ...previousReceipt,
      target: { ...previousReceipt.target, tzdbVersion: previousTzdbVersion },
      comparison: {
        ...previousReceipt.comparison,
        target: { ...previousReceipt.comparison.target, tzdbVersion: previousTzdbVersion }
      }
    };
    vi.spyOn(caseRepository, "getCandidateSet").mockResolvedValue(source);
    vi.spyOn(caseRepository, "listTzdbMigrationReceiptsForCandidateSet").mockResolvedValue([historicalReceipt]);

    render(<CandidateSetPage candidateSetId={source.id} />);

    expect(await screen.findByRole("heading", { name: "时区快照并列复算" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /按目标快照生成并列候选组/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "按 IANA 2026c 并列复算" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("heading", { name: "并列复算目标" })).toBeTruthy();
  });

  it("源页与目标页互链，并列展示迁移凭证的 13 探针行为和摘要分类", async () => {
    const storedSource = await storeCandidateSet();
    const source = asLegacyCandidateSet(storedSource);
    const target = await storeCandidateSet();
    const receipt = makeMigrationReceipt(source, target);
    vi.spyOn(caseRepository, "getCandidateSet").mockImplementation(async (id) => id === source.id ? source : target);
    const listReceipts = vi.spyOn(caseRepository, "listTzdbMigrationReceiptsForCandidateSet").mockResolvedValue([receipt]);

    const sourcePage = render(<CandidateSetPage candidateSetId={source.id} />);

    expect(await screen.findByRole("heading", { name: "并列复算目标" })).toBeTruthy();
    expect(screen.getByRole("link", { name: target.id }).getAttribute("href")).toBe(`/candidate-sets/${target.id}`);
    expect(screen.queryByRole("checkbox", { name: /按目标快照生成并列候选组/ })).toBeNull();
    expect(within(screen.getByRole("region", { name: "基准快照" })).getByText("旧版浏览器 Intl · 具体版本未识别")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "并列复算快照" })).getByText(`IANA ${target.candidateSet.timeZoneDatabase?.ianaVersion}`)).toBeTruthy();
    expect(screen.getByText("仅摘要改变 13")).toBeTruthy();
    expect(screen.getByText(/冻结的旧比较格式/)).toBeTruthy();
    const table = screen.getByRole("table", { name: "候选组 tzdb 并列复算 13 探针行为与摘要分类" });
    expect(within(table).getAllByRole("row")).toHaveLength(14);
    expect(within(table).getAllByText("行为未变")).toHaveLength(13);
    expect(within(table).getAllByText("摘要改变")).toHaveLength(13);
    expect(screen.queryByRole("button", { name: /主盘/ })).toBeNull();

    sourcePage.unmount();
    render(<CandidateSetPage candidateSetId={target.id} />);

    expect(await screen.findByRole("heading", { name: "并列复算基准" })).toBeTruthy();
    expect(screen.getByRole("link", { name: source.id }).getAttribute("href")).toBe(`/candidate-sets/${source.id}`);
    expect(screen.getByText("当前记录已经是并列复算结果")).toBeTruthy();
    expect(listReceipts).toHaveBeenNthCalledWith(1, source.id);
    expect(listReceipts).toHaveBeenNthCalledWith(2, target.id);
  });

  it("用 Casablanca 真实差异生成 2026c→2025b 的 13 探针并列复算且禁止反向成环", async () => {
    const sourceCandidateSet = await calculateUnknownHourCandidates(
      casablancaUnknownHourInput,
      WORKING_DEFAULT_RULE_PROFILE
    );
    const source = await caseRepository.createCandidateSet({
      alias: "Casablanca 双快照",
      tags: ["tzdb"],
      notes: "真实偏移差异",
      candidateSet: sourceCandidateSet
    });
    const sourceBefore = structuredClone(source);

    const sourcePage = render(<CandidateSetPage candidateSetId={source.id} />);

    expect(await screen.findByRole("heading", { name: "时区快照并列复算" })).toBeTruthy();
    expect(screen.getByText("2025b", { exact: true })).toBeTruthy();
    expect(screen.getByText(RETAINED_TIME_ZONE_DATABASE_2025B.dataSha256)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /按目标快照生成并列候选组/ }));
    fireEvent.click(screen.getByRole("button", { name: "按 IANA 2025b 并列复算" }));

    expect(await screen.findByText("并列候选组和可核验凭证已生成，基准记录未改写", {}, { timeout: 10_000 })).toBeTruthy();
    const records = await caseRepository.listCandidateSets();
    expect(records).toHaveLength(2);
    expect(records.find((record) => record.id === source.id)).toEqual(sourceBefore);
    const target = records.find((record) => record.id !== source.id)!;
    expect(target.candidateSet.tzdbVersion).toBe(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
    expect(target.candidateSet.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    for (const probe of target.candidateSet.candidates) {
      for (const variant of probe.variants) {
        expect(variant.chart.manifest.tzdbVersion).toBe(RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
        expect(variant.chart.manifest.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
      }
    }
    const [receipt] = await caseRepository.listTzdbMigrationReceiptsForCandidateSet(source.id);
    expect(receipt.comparison.behaviorChangedCount).toBe(13);
    expect(receipt.comparison.hashOnlyChangedCount).toBe(0);

    sourcePage.unmount();
    render(<CandidateSetPage candidateSetId={target.id} />);
    expect(await screen.findByText("当前记录已经是并列复算结果")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /按目标快照生成并列候选组/ })).toBeNull();
    expect(screen.getByRole("link", { name: /打开并列复算基准/ }).getAttribute("href")).toBe(`/candidate-sets/${source.id}`);
  }, 15_000);

  it("记录不存在时显示缺失说明并允许返回案例库", async () => {
    vi.spyOn(caseRepository, "getCandidateSet").mockResolvedValue(null);

    render(<CandidateSetPage candidateSetId="22222222-2222-4222-8222-222222222222" />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("找不到未知时辰候选组")).toBeTruthy();
    expect(within(alert).getByRole("link", { name: "返回案例库" }).getAttribute("href")).toBe("/cases");
  });

  it("导出完整候选组记录而不是任一代表盘", async () => {
    const record = await storeCandidateSet();

    render(<CandidateSetPage candidateSetId={record.id} />);
    fireEvent.click(await screen.findByRole("button", { name: "导出候选组 JSON" }));

    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [filename, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    expect(filename).toBe(`hakimi-unknown-hour-candidate-set-${record.id}.json`);
    expect(mediaType).toBe("application/json;charset=utf-8");

    const exported = JSON.parse(raw) as CandidateSetRecord;
    expect(exported.id).toBe(record.id);
    expect(exported.recordType).toBe("unknown_hour_candidate_set");
    expect(exported.candidateSet.input.time).toBeNull();
    expect(exported.candidateSet.input.timePrecision).toBe("unknown_hour");
    expect(exported.candidateSet.candidates).toHaveLength(13);
    expect(exported.candidateSet.candidates.some((candidate) => candidate.variants.length === 2)).toBe(true);
    expect(exported.snapshotDigest).toBe(record.snapshotDigest);
  });
});
