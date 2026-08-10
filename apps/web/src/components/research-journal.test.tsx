import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventRecordSchema, type BirthInput, type EventRecord, type TransitNode } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  createRevisionCalculationReceipt,
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE
} from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, knowledgeRepository, researchRepository } from "@hakimi/storage";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import { resolveEventTimeContextForBundledSnapshot } from "@hakimi/time-core";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { readResearchQueryDraft, removeResearchQueryDraft } from "../lib/research-query-session";
import { ResearchJournal } from "./research-journal";

const {
  getCapabilitiesMock,
  saveFileMock,
  saveFileToChosenLocationMock,
  shareFileMock,
  printReportMock,
  toBlobMock
} = vi.hoisted(() => ({
  getCapabilitiesMock: vi.fn(),
  saveFileMock: vi.fn(),
  saveFileToChosenLocationMock: vi.fn(),
  shareFileMock: vi.fn(),
  printReportMock: vi.fn(),
  toBlobMock: vi.fn()
}));
vi.mock("@hakimi/platform", () => ({
  webReportExportPort: {
    getCapabilities: getCapabilitiesMock,
    saveFile: saveFileMock,
    saveFileToChosenLocation: saveFileToChosenLocationMock,
    shareFile: shareFileMock,
    printReport: printReportMock
  }
}));
vi.mock("html-to-image", () => ({ toBlob: toBlobMock }));

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

const unknownHourInput: BirthInput = {
  ...input,
  time: null,
  timePrecision: "unknown_hour"
};

function legacyMinuteEvent(caseId: string, revisionId: string): EventRecord {
  return eventRecordSchema.parse({
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    caseId,
    revisionId,
    transitNodeRef: null,
    datePrecision: "minute",
    startDate: "2022-06-18T10:00",
    endDate: null,
    title: "旧版分钟事件",
    tags: ["旧资料"],
    sourceRefs: [],
    feedback: "unreviewed",
    bodyFormat: "markdown",
    body: "迁移前记录",
    timeContext: { kind: "legacy_floating" },
    deletedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  });
}

function legacyCalendarEvent(
  caseId: string,
  revisionId: string,
  precision: Exclude<EventRecord["datePrecision"], "minute">,
  sequence: number
): EventRecord {
  const starts: Record<typeof precision, string | null> = {
    year: "2020",
    month: "2020-06",
    day: "2020-06-18",
    unknown: null
  };
  const labels: Record<typeof precision, string> = {
    year: "年",
    month: "月",
    day: "日",
    unknown: "未知"
  };
  return eventRecordSchema.parse({
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id: `10000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    caseId,
    revisionId,
    transitNodeRef: null,
    datePrecision: precision,
    startDate: starts[precision],
    endDate: null,
    title: `旧版${labels[precision]}精度事件`,
    tags: [],
    sourceRefs: [],
    feedback: "unreviewed",
    bodyFormat: "markdown",
    body: "旧版非分钟记录",
    timeContext: { kind: "legacy_floating" },
    deletedAt: null,
    createdAt: `2026-08-01T00:00:0${sequence}.000Z`,
    updatedAt: `2026-08-01T00:00:0${sequence}.000Z`
  });
}

async function createDayEvent(input: {
  caseId: string;
  revisionId: string | null;
  title: string;
  feedback?: EventRecord["feedback"];
  tags?: string[];
  transitNode?: TransitNode | null;
}) {
  return researchRepository.createEvent({
    caseId: input.caseId,
    revisionId: input.revisionId,
    transitNodeRef: input.transitNode?.ref ?? null,
    datePrecision: "day",
    startDate: "2026-08-01",
    endDate: null,
    title: input.title,
    tags: input.tags ?? [],
    sourceRefs: [],
    feedback: input.feedback ?? "unreviewed",
    body: `${input.title}正文`
  });
}

beforeEach(async () => {
  getCapabilitiesMock.mockReset().mockReturnValue({
    canDownloadFiles: true,
    canChooseSaveLocation: true,
    canShareFiles: true
  });
  saveFileMock.mockReset().mockImplementation(async (_blob: Blob, filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  saveFileToChosenLocationMock.mockReset().mockImplementation(async (blob: Blob, filename: string) => ({
    status: "saved",
    filename,
    method: "file_system_access",
    bytesWritten: blob.size
  }));
  shareFileMock.mockReset().mockImplementation(async (_blob: Blob, filename: string) => ({
    status: "shared",
    filename,
    method: "web_share"
  }));
  printReportMock.mockReset();
  toBlobMock.mockReset();
  toBlobMock.mockResolvedValue(new Blob(["png-fixture"], { type: "image/png" }));
  await caseRepository.clearAll();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await caseRepository.clearAll();
});

describe("ResearchJournal", () => {
  it("从事件卡创建仅以随机 UUID 暴露在 URL 中的严格研究查询草稿", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "事件检索入口", calculated });
    const revision = bundle.revisions[0];
    const record = await createDayEvent({
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      title: "隐私事件 · 事业转折",
      feedback: "supports",
      tags: ["事业", "复盘"]
    });
    const originalRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    let draftId: string | null = null;

    try {
      render(
        <ResearchJournal
          caseId={bundle.caseRecord.id}
          revision={revision}
          selection={{ pillar: "day", field: "stem" }}
        />
      );

      fireEvent.click(await screen.findByRole("button", { name: `按此事件条件检索：${record.title}` }));
      const route = new URL(window.location.href);
      expect(route.pathname).toBe("/cases/research");
      expect([...route.searchParams.keys()]).toEqual(["draft"]);
      draftId = route.searchParams.get("draft");
      expect(draftId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(decodeURIComponent(route.search)).not.toContain(record.title);
      expect(route.search).not.toContain(record.caseId);
      expect(route.search).not.toContain(record.id);

      const stored = readResearchQueryDraft(draftId!);
      expect(stored.issue).toBeNull();
      expect(stored.draft?.query).toMatchObject({
        scope: "events",
        text: "隐私事件 · 事业转折",
        tags: ["事业", "复盘"],
        feedbacks: ["supports"],
        lifecycle: "active",
        binding: { kind: "context_revision", caseId: record.caseId, revisionId: revision.id }
      });
    } finally {
      if (draftId) removeResearchQueryDraft(draftId);
      window.history.replaceState({}, "", originalRoute);
    }
  });

  it("会话草稿无法写入时停留原页并给出可访问错误", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "草稿失败关闭", calculated });
    const revision = bundle.revisions[0];
    const record = await createDayEvent({
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      title: "不会泄露到路由的事件"
    });
    const originalRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("模拟会话存储不可用", "QuotaExceededError");
    });

    try {
      render(
        <ResearchJournal
          caseId={bundle.caseRecord.id}
          revision={revision}
          selection={{ pillar: "day", field: "stem" }}
        />
      );

      fireEvent.click(await screen.findByRole("button", { name: `按此事件条件检索：${record.title}` }));
      expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(originalRoute);
      expect(screen.getByRole("alert").textContent).toContain("模拟会话存储不可用");
      expect(window.location.href).not.toContain(record.title);
      expect(window.location.href).not.toContain(record.id);
    } finally {
      setItem.mockRestore();
      window.history.replaceState({}, "", originalRoute);
    }
  });

  it("完成笔记与真实事件的保存、检索和软删除闭环", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "研究样本", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Markdown 笔记/), {
      target: { value: "日干观察：需用事件反证，不视为命盘事实。" }
    });
    fireEvent.change(screen.getAllByLabelText("标签")[0], { target: { value: "日干，待核验" } });
    fireEvent.click(screen.getByRole("button", { name: "保存笔记" }));

    expect(await screen.findByText("研究笔记已保存到本地案例。")).toBeTruthy();
    expect(await screen.findByText("日干观察：需用事件反证，不视为命盘事实。")).toBeTruthy();
    const hits = await researchRepository.searchCasesAndNotes("事件反证");
    expect(hits).toHaveLength(1);
    expect(hits[0].matchingNoteIds).toHaveLength(1);
    const noteCitationLink = screen.getByRole("link", { name: "为笔记添加知识引用" });
    const noteCitationUrl = new URL(noteCitationLink.getAttribute("href")!, "https://hakimi.test");
    expect(noteCitationUrl.pathname).toBe("/knowledge");
    expect(noteCitationUrl.searchParams.get("target")).toBe("research_note");
    expect(noteCitationUrl.searchParams.get("note")).toBe(hits[0].matchingNoteIds[0]);

    fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: "第一次转岗" } });
    fireEvent.change(screen.getByLabelText("起始日期"), { target: { value: "2022-06-18" } });
    fireEvent.change(screen.getByLabelText("事件笔记"), { target: { value: "用于检验事业假设。" } });
    fireEvent.click(screen.getByRole("button", { name: "添加事件" }));

    expect(await screen.findByText("事件已链接到当前案例与修订。")).toBeTruthy();
    expect(await screen.findByText("第一次转岗")).toBeTruthy();
    const eventBeforeDelete = (await researchRepository.listEventsByCase(bundle.caseRecord.id))[0];
    const eventCitationLink = screen.getByRole("link", { name: "为事件添加知识引用" });
    const eventCitationUrl = new URL(eventCitationLink.getAttribute("href")!, "https://hakimi.test");
    expect(eventCitationUrl.searchParams.get("target")).toBe("event");
    expect(eventCitationUrl.searchParams.get("event")).toBe(eventBeforeDelete.id);
    fireEvent.click(screen.getByRole("button", { name: "软删除事件" }));

    fireEvent.change(screen.getByLabelText("生命周期"), { target: { value: "deleted" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "恢复事件" })).toBeTruthy());
    const events = await researchRepository.listEventsByCase(bundle.caseRecord.id, { includeDeleted: true });
    expect(events).toHaveLength(1);
    expect(events[0].deletedAt).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "导出单盘 Markdown" }));
    const deliveryDialog = await screen.findByRole("dialog", { name: "文件已在本机生成" });
    expect(within(deliveryDialog).getByText("hakimi-chart-r1-anonymous.md")).toBeTruthy();
    expect(saveFileMock).not.toHaveBeenCalled();
    fireEvent.click(within(deliveryDialog).getByRole("button", { name: "下载文件" }));
    await waitFor(() => expect(saveFileMock).toHaveBeenCalledTimes(1));
    const [blob, filename] = saveFileMock.mock.calls[0] as [Blob, string];
    const content = await blob.text();
    expect(filename).toBe("hakimi-chart-r1-anonymous.md");
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(content).toContain("1995-08-18");
    expect(content).toContain("出生日期、出生时间和时区仍可能用于重新识别个人");
    expect(content).not.toContain("研究样本");
    expect(content).not.toContain("日干观察");
  });

  it("用同一份冻结的单盘 Markdown 支持下载、指定位置保存和系统分享", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "冻结交付样本", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "导出单盘 Markdown" }));
    const dialog = await screen.findByRole("dialog", { name: "文件已在本机生成" });
    expect(saveFileMock).not.toHaveBeenCalled();
    expect(saveFileToChosenLocationMock).not.toHaveBeenCalled();
    expect(shareFileMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "系统分享" }));
    await waitFor(() => expect(shareFileMock).toHaveBeenCalledTimes(1));
    const [sharedBlob, sharedFilename, sharedTitle] = shareFileMock.mock.calls[0] as [Blob, string, string];

    fireEvent.click(within(dialog).getByRole("button", { name: "保存到指定位置" }));
    await waitFor(() => expect(saveFileToChosenLocationMock).toHaveBeenCalledTimes(1));
    const [chosenBlob, chosenFilename] = saveFileToChosenLocationMock.mock.calls[0] as [Blob, string];

    fireEvent.click(within(dialog).getByRole("button", { name: "下载文件" }));
    await waitFor(() => expect(saveFileMock).toHaveBeenCalledTimes(1));
    const [downloadedBlob, downloadedFilename] = saveFileMock.mock.calls[0] as [Blob, string];

    expect(chosenBlob).toBe(sharedBlob);
    expect(downloadedBlob).toBe(sharedBlob);
    expect(sharedFilename).toBe("hakimi-chart-r1-anonymous.md");
    expect(chosenFilename).toBe(sharedFilename);
    expect(downloadedFilename).toBe(sharedFilename);
    expect(sharedTitle).toBe("匿名单盘 Markdown");
    expect(await sharedBlob.text()).toContain("出生日期、出生时间和时区仍可能用于重新识别个人");
  });

  it("完整单盘 Markdown 与研究 CSV 冻结为敏感工件并禁止系统分享", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "敏感交付样本", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /匿名导出/ }));

    fireEvent.click(screen.getByRole("button", { name: "导出单盘 Markdown" }));
    let dialog = await screen.findByRole("dialog", { name: "文件已在本机生成" });
    expect(within(dialog).getByText("完整单盘 Markdown")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "系统分享" })).toBeNull();
    expect(within(dialog).getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "文件已在本机生成" })).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "导出案例研究 CSV" }));
    dialog = await screen.findByRole("dialog", { name: "文件已在本机生成" });
    expect(within(dialog).getByText("完整案例研究 CSV")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "系统分享" })).toBeNull();
    expect(within(dialog).getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
    expect(shareFileMock).not.toHaveBeenCalled();
  });

  it("先冻结案例研究 CSV，并在匿名开关变化时丢弃旧工件", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "CSV 交付样本", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "导出案例研究 CSV" }));
    const dialog = await screen.findByRole("dialog", { name: "文件已在本机生成" });
    expect(within(dialog).getByText("匿名案例研究 CSV")).toBeTruthy();
    expect(within(dialog).getByText("bazi-research-anonymous.csv")).toBeTruthy();
    expect(saveFileMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /匿名导出/ }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "文件已在本机生成" })).toBeNull());
    expect(saveFileMock).not.toHaveBeenCalled();
    expect(saveFileToChosenLocationMock).not.toHaveBeenCalled();
    expect(shareFileMock).not.toHaveBeenCalled();
  });

  it("从运限页创建事件时写入稳定节点引用，普通编辑不会清空绑定", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "运限绑定样本", calculated });
    const revision = bundle.revisions[0];
    const snapshot = await calculateTransitSnapshot({ revision, atInstant: "2026-08-01T12:00:00Z" });
    if (snapshot.slots.year.status !== "resolved") throw new Error("测试夹具缺少活动流年");
    const transitNode = snapshot.slots.year.node;

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
        transitNode={transitNode}
      />
    );

    expect(await screen.findByText(new RegExp(`绑定所选year节点 · ${transitNode.ganZhi}`))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: "运限节点事件" } });
    fireEvent.change(screen.getByLabelText("起始日期"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "添加事件" }));

    expect(await screen.findByText("事件已链接到当前案例、修订与运限节点。")).toBeTruthy();
    let records = await researchRepository.listEventsByCase(bundle.caseRecord.id);
    expect(records[0].transitNodeRef).toEqual(transitNode.ref);
    const backLink = await screen.findByRole("link", { name: /返回绑定运限节点/ });
    const backUrl = new URL(backLink.getAttribute("href")!, "https://hakimi.test");
    expect(backUrl.pathname).toBe(`/cases/${bundle.caseRecord.id}/revisions/${revision.id}`);
    expect(backUrl.searchParams.get("view")).toBe("transit");
    expect(backUrl.searchParams.get("at")).toBe(transitNode.ref.startInstant.replace(".000Z", "Z"));
    expect(backUrl.searchParams.get("node")).toBe(`${transitNode.nodeType}:${transitNode.ref.nodeId}`);

    fireEvent.click(screen.getByRole("button", { name: "编辑事件" }));
    expect(screen.getByText(/原修订与运限节点绑定会被保留/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("事件笔记"), { target: { value: "补充真实反馈。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存事件修改" }));
    expect(await screen.findByText("事件记录已更新。")).toBeTruthy();

    records = await researchRepository.listEventsByCase(bundle.caseRecord.id);
    expect(records[0].transitNodeRef).toEqual(transitNode.ref);
    expect(records[0].body).toBe("补充真实反馈。");
  });

  it("分钟事件默认采用研究对象时区并展示唯一偏移与标准 UTC", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "上海分钟事件", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
        defaultTimeZone="Asia/Shanghai"
      />
    );
    await screen.findByText("还没有事件记录。");

    fireEvent.change(screen.getByLabelText("日期精度"), { target: { value: "minute" } });
    expect(screen.getByLabelText(/事件时区/)).toHaveProperty("value", "Asia/Shanghai");
    fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: "上海精确分钟" } });
    fireEvent.change(screen.getByLabelText("起始民用分钟"), { target: { value: "2026-08-01T12:30" } });

    expect(await screen.findByText("UTC 偏移 +08:00")).toBeTruthy();
    expect(screen.getByText("标准 UTC 2026-08-01T04:30:00Z")).toBeTruthy();
    const save = screen.getByRole("button", { name: "添加事件" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    expect(await screen.findByText("事件已链接到当前案例与修订。")).toBeTruthy();
    const [record] = await researchRepository.listEventsByCase(bundle.caseRecord.id);
    expect(record.timeContext.kind).toBe("zoned_minute");
    if (record.timeContext.kind !== "zoned_minute") throw new Error("测试事件未保存 zoned_minute");
    expect(record.timeContext.timeZone).toBe("Asia/Shanghai");
    expect(record.timeContext.start.resolution.selectedCandidate.utcOffset).toBe("+08:00");
    expect(record.timeContext.start.canonicalUtc).toBe("2026-08-01T04:30:00Z");
  });

  it("历史 identified Event 可由用户按随包 2025b 原工件只读复核", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "历史时区复核", calculated });
    const revision = bundle.revisions[0];
    const timeContext = await resolveEventTimeContextForBundledSnapshot({
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      timeZone: "Africa/Casablanca"
    }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
    const historical = eventRecordSchema.parse({
      schemaVersion: "1.0.0",
      recordVersion: 2,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      transitNodeRef: null,
      datePrecision: "minute",
      startDate: "2026-10-01T12:00",
      endDate: null,
      title: "卡萨布兰卡历史事件",
      tags: ["tzdb"],
      sourceRefs: [],
      feedback: "unreviewed",
      bodyFormat: "markdown",
      body: "2025b 历史复核夹具",
      timeContext,
      deletedAt: null,
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z"
    });
    await researchRepository.database.events.add(historical);

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    expect(await screen.findByText("卡萨布兰卡历史事件")).toBeTruthy();
    expect(screen.getByText("当前应用保留历史工件")).toBeTruthy();
    expect(screen.getByText(/起始 \+01:00 · UTC 2026-10-01T11:00:00Z/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "按 IANA 2025b 原工件复核" }));
    expect(await screen.findByText(/已按 IANA 2025b 原工件复核，冻结 UTC 与 DST 候选一致/)).toBeTruthy();
    expect((await researchRepository.getEvent(historical.id))?.timeContext).toEqual(timeContext);
  });

  it("纽约 DST overlap 必须选择 earlier/later，gap 明确拒绝保存", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "纽约分钟事件", calculated });
    const revision = bundle.revisions[0];

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );
    await screen.findByText("还没有事件记录。");

    const fillOverlap = (title: string, localDateTime = "2025-11-02T01:30") => {
      fireEvent.change(screen.getByLabelText("日期精度"), { target: { value: "minute" } });
      fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: title } });
      fireEvent.change(screen.getByLabelText(/事件时区/), { target: { value: "America/New_York" } });
      fireEvent.change(screen.getByLabelText("起始民用分钟"), { target: { value: localDateTime } });
    };

    fillOverlap("纽约 overlap earlier");
    expect(screen.getByLabelText("事件时区（IANA） 必填").closest(".event-time-panel")?.textContent).toContain("尚未选择 earlier / later");
    expect((screen.getByRole("button", { name: "添加事件" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /较早瞬时点/ }));
    expect((screen.getByRole("button", { name: "添加事件" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "添加事件" }));
    await screen.findByText("纽约 overlap earlier");

    await waitFor(() => expect(screen.getByLabelText("日期精度")).toHaveProperty("value", "day"));
    fillOverlap("纽约 overlap later", "2025-11-02T01:45");
    expect(screen.getByLabelText("日期精度")).toHaveProperty("value", "minute");
    expect(screen.getByLabelText(/事件时区/)).toHaveProperty("value", "America/New_York");
    expect(screen.getByLabelText("起始民用分钟")).toHaveProperty("value", "2025-11-02T01:45");
    expect(screen.getByLabelText("事件时区（IANA） 必填").closest(".event-time-panel")?.textContent).toContain("尚未选择 earlier / later");
    fireEvent.click(await screen.findByRole("radio", { name: /较晚瞬时点/ }));
    fireEvent.click(screen.getByRole("button", { name: "添加事件" }));
    await screen.findByText("纽约 overlap later");

    const overlapRecords = await researchRepository.listEventsByCase(bundle.caseRecord.id);
    const earlier = overlapRecords.find((record) => record.title.endsWith("earlier"));
    const later = overlapRecords.find((record) => record.title.endsWith("later"));
    expect(earlier?.timeContext.kind).toBe("zoned_minute");
    expect(later?.timeContext.kind).toBe("zoned_minute");
    if (earlier?.timeContext.kind !== "zoned_minute" || later?.timeContext.kind !== "zoned_minute") throw new Error("缺少 overlap 事件");
    expect(earlier.timeContext.start.canonicalUtc).toBe("2025-11-02T05:30:00Z");
    expect(later.timeContext.start.canonicalUtc).toBe("2025-11-02T06:45:00Z");

    fireEvent.change(screen.getByLabelText("日期精度"), { target: { value: "minute" } });
    fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: "纽约 gap" } });
    fireEvent.change(screen.getByLabelText(/事件时区/), { target: { value: "America/New_York" } });
    fireEvent.change(screen.getByLabelText("起始民用分钟"), { target: { value: "2025-03-09T02:30" } });
    expect(await screen.findByText("起始时间落在 DST 空档")).toBeTruthy();
    expect((screen.getByRole("button", { name: "添加事件" }) as HTMLButtonElement).disabled).toBe(true);
    expect(await researchRepository.listEventsByCase(bundle.caseRecord.id)).toHaveLength(2);
  });

  it("旧版悬空分钟普通编辑只改正文元数据，并从事件卡片提供显式派生入口", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "旧分钟升级", calculated });
    const revision = bundle.revisions[0];
    const legacy = legacyMinuteEvent(bundle.caseRecord.id, revision.id);
    await researchRepository.database.events.add(legacy);
    const updateEvent = vi.spyOn(researchRepository, "updateEvent");

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
        selectedEventId={legacy.id}
        onSelectEvent={vi.fn()}
      />
    );

    expect((await screen.findAllByText("旧版悬空时间")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "编辑事件" }));
    expect(screen.getByText(/旧记录的日期精度与起止墙钟值保持只读/)).toBeTruthy();
    expect((screen.getByLabelText("日期精度") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("起始民用分钟") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("结束民用分钟（可选）") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText(/事件时区/)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /我确认按所选时区/ })).toBeNull();
    expect(screen.getByRole("button", { name: "解释时间并创建并列事件" })).toBeTruthy();
    expect(screen.queryByText(/升级后标准 UTC/)).toBeNull();
    expect(document.querySelector(".event-time-preview")).toBeNull();
    fireEvent.change(screen.getByLabelText("事件笔记"), { target: { value: "只改正文，时间保持悬空" } });
    fireEvent.click(screen.getByRole("button", { name: "保存事件修改" }));
    await screen.findByText("事件记录已更新。");
    expect(updateEvent).toHaveBeenCalledTimes(1);
    const patch = updateEvent.mock.calls[0]?.[1];
    expect(patch).toEqual({
      title: "旧版分钟事件",
      tags: ["旧资料"],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "只改正文，时间保持悬空"
    });
    expect(patch && "datePrecision" in patch).toBe(false);
    expect(patch && "startDate" in patch).toBe(false);
    expect(patch && "timeZone" in patch).toBe(false);
    const stored = await researchRepository.getEvent(legacy.id);
    expect(stored?.id).toBe(legacy.id);
    expect(stored?.timeContext).toEqual({ kind: "legacy_floating" });
    expect((await researchRepository.listEventsByCase(bundle.caseRecord.id)).map((record) => record.id)).toEqual([legacy.id]);

    fireEvent.click(screen.getByRole("button", { name: "解释时间并创建并列事件" }));
    expect(await screen.findByRole("heading", { name: "解释旧事件时间" })).toBeTruthy();
    const confirmation = screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }) as HTMLInputElement;
    expect(confirmation.disabled).toBe(false);
    fireEvent.click(confirmation);
    fireEvent.click(screen.getByRole("button", { name: "生成并列事件" }));
    const successText = await screen.findByText("新事件和时间迁移凭证已生成，旧事件未改写");
    const success = successText.closest(".event-time-migration-success");
    expect(success).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(success));

    const derivedRecords = await researchRepository.listEventsByCase(bundle.caseRecord.id);
    expect(derivedRecords).toHaveLength(2);
    expect(derivedRecords.find((record) => record.id === legacy.id)).toEqual(stored);
    const target = derivedRecords.find((record) => record.id !== legacy.id);
    expect(target?.timeContext.kind).toBe("zoned_minute");
    if (target?.timeContext.kind !== "zoned_minute") throw new Error("缺少派生分钟事件");
    expect(target.timeContext.timeZone).toBe("Asia/Shanghai");
    expect(target.timeContext.start.canonicalUtc).toBe("2022-06-18T02:00:00Z");
    const receipts = await researchRepository.listEventTimeMigrationReceiptsForEvent(legacy.id);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].source.recordId).toBe(legacy.id);
    expect(receipts[0].target.recordId).toBe(target.id);

    fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
    let reportDialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
    expect(reportDialog.textContent).toContain("匿名模式已移除事件时间上下文与迁移凭证。");
    expect(reportDialog.textContent).not.toContain(receipts[0].id);
    expect(reportDialog.textContent).not.toContain(receipts[0].source.snapshotDigest);
    fireEvent.click(within(reportDialog).getByRole("button", { name: "关闭单盘报告预览" }));

    const anonymizedToggle = screen.getByRole("checkbox", { name: /匿名导出/ });
    fireEvent.click(anonymizedToggle);
    fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
    reportDialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
    const receiptCard = within(reportDialog).getByRole("article", {
      name: `事件时间迁移凭证 ${receipts[0].id}`
    });
    expect(reportDialog.textContent).toContain("1 条显式派生凭证");
    expect(receiptCard.textContent).toContain("explicit_local_user_confirmation");
    expect(receiptCard.textContent).toContain(legacy.id);
    expect(receiptCard.textContent).toContain(target.id);
    expect(receiptCard.textContent).toContain(receipts[0].source.snapshotDigest);
    expect(receiptCard.textContent).toContain(receipts[0].target.snapshotDigest);
    expect(receiptCard.textContent).toContain("zoned_minute");
    expect(receiptCard.textContent).toContain("Asia/Shanghai");
    expect(receiptCard.textContent).toContain("2022-06-18T02:00:00Z");
  });

  it("年、月、日与未知精度的全部旧事件普通编辑都锁定原时间，并提供 calendar_date 派生说明", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "旧日历精度", calculated });
    const revision = bundle.revisions[0];
    const records = (["year", "month", "day", "unknown"] as const).map((precision, index) =>
      legacyCalendarEvent(bundle.caseRecord.id, revision.id, precision, index + 1)
    );
    await researchRepository.database.events.bulkAdd(records);

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );

    await screen.findByText("旧版年精度事件");
    for (const record of records) {
      const card = screen.getByRole("article", { name: `事件 ${record.title}` });
      fireEvent.click(within(card).getByRole("button", { name: "编辑事件" }));
      expect((screen.getByLabelText("日期精度") as HTMLSelectElement).disabled).toBe(true);
      expect((screen.getByLabelText("起始日期") as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByLabelText("结束日期（可选）") as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByText(/旧记录的日期精度与起止墙钟值保持只读/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
    }

    const dayRecord = records.find((record) => record.datePrecision === "day")!;
    const dayCard = screen.getByRole("article", { name: `事件 ${dayRecord.title}` });
    fireEvent.click(within(dayCard).getByRole("button", { name: "解释时间并创建并列事件" }));
    expect(screen.getByText("派生为 calendar_date")).toBeTruthy();
    expect(screen.getByText(/日历日期不适用 IANA 时区、DST、UTC 偏移或标准 UTC/)).toBeTruthy();
    expect(screen.queryByLabelText(/事件发生地时区/)).toBeNull();
  });

  it("组合筛选显示 n/total，并把被筛掉的精确深链事件固定、滚动和聚焦", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "事件筛选", calculated });
    const revision = bundle.revisions[0];
    const snapshot = await calculateTransitSnapshot({ revision, atInstant: "2026-08-01T12:00:00Z" });
    if (snapshot.slots.year.status !== "resolved") throw new Error("测试夹具缺少流年");
    const node = snapshot.slots.year.node;
    await createDayEvent({ caseId: bundle.caseRecord.id, revisionId: revision.id, title: "事业验证", feedback: "supports", tags: ["事业"] });
    await createDayEvent({ caseId: bundle.caseRecord.id, revisionId: revision.id, title: "节点反例", feedback: "contradicts", tags: ["反例"], transitNode: node });
    const selected = await createDayEvent({ caseId: bundle.caseRecord.id, revisionId: null, title: "已删案例线索", tags: ["家庭"] });
    await researchRepository.softDeleteEvent(selected.id);

    render(
      <ResearchJournal
        caseId={bundle.caseRecord.id}
        revision={revision}
        selection={{ pillar: "day", field: "stem" }}
        transitNode={node}
        selectedEventId={selected.id}
      />
    );

    const selectedCard = await screen.findByRole("article", { name: "事件 已删案例线索" });
    await waitFor(() => expect(document.activeElement).toBe(selectedCard));
    fireEvent.change(screen.getByLabelText("生命周期"), { target: { value: "active" } });
    fireEvent.change(screen.getByLabelText("反馈筛选"), { target: { value: "supports" } });
    fireEvent.change(screen.getByLabelText("绑定范围"), { target: { value: "current_revision" } });
    fireEvent.change(screen.getByLabelText("事件标签"), { target: { value: "事业" } });
    expect(screen.getByText(/显示 1 \/ 3 条事件；深链事件另行固定显示/)).toBeTruthy();
    expect(screen.getByText("事业验证")).toBeTruthy();
    expect(screen.getByText("深链定位 · 已固定显示")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("搜索事件"), { target: { value: "完全不匹配" } });
    expect(screen.getByText(/显示 0 \/ 3 条事件；深链事件另行固定显示/)).toBeTruthy();
    expect(screen.queryByText("事业验证")).toBeNull();
    expect(screen.getByText("已删案例线索")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "清空筛选" }));
    expect(screen.getByText(/显示 2 \/ 3 条事件；深链事件另行固定显示/)).toBeTruthy();
  });

  it("编辑时聚焦标题，取消后把焦点还给原编辑按钮", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "事件焦点", calculated });
    const revision = bundle.revisions[0];
    await createDayEvent({ caseId: bundle.caseRecord.id, revisionId: revision.id, title: "焦点事件" });

    render(<ResearchJournal caseId={bundle.caseRecord.id} revision={revision} selection={{ pillar: "day", field: "stem" }} />);
    await screen.findByText("焦点事件");
    const edit = screen.getByRole("button", { name: "编辑事件" });
    fireEvent.click(edit);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/事件标题/)));
    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));
    await waitFor(() => expect(document.activeElement).toBe(edit));
  });

  it("预览锁定历史修订，并把同一报告模型交给 PNG 与系统 PDF 端口", async () => {
    const firstChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const first = await caseRepository.createCase({ alias: "历史单盘", calculated: firstChart });
    const firstRevision = first.revisions[0];
    await caseRepository.addRevision(
      first.caseRecord.id,
      await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );

    render(
      <ResearchJournal
        caseId={first.caseRecord.id}
        revision={firstRevision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );
    await screen.findByText("还没有研究笔记。");

    const previewButton = screen.getByRole("button", { name: "预览 PNG / PDF" });
    previewButton.focus();
    fireEvent.click(previewButton);
    const dialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    const reportRegion = within(dialog).getByRole("region", { name: "单盘报告正文，可滚动" });
    expect(dialog.textContent).toContain("匿名模式 · 格式 1.4.0");
    const sourceMarker = within(reportRegion).getByRole("group", {
      name: /下游计算来源：当前版本即时投影；精确复演：不适用；收据账本：当前发布代无收据账本/
    });
    expect(sourceMarker.getAttribute("data-source")).toBe("explicit_projection");
    expect(sourceMarker.getAttribute("data-ledger-status")).toBe("schema_unavailable");
    expect(sourceMarker.getAttribute("data-comparison-status")).toBe("not_applicable");
    const calculationSource = within(reportRegion).getByRole("region", { name: "下游计算来源" });
    expect(calculationSource.textContent).toContain("当前发布代无收据账本（schema_unavailable）");
    expect(calculationSource.textContent).toContain("历史输出比对未比较");
    expect(within(calculationSource).getByRole("article", {
      name: "四柱关系：已计算；来源：当前版本即时投影"
    })).toBeTruthy();
    expect(within(calculationSource).getByRole("article", {
      name: "Transit：本次未请求；来源：本次未请求"
    })).toBeTruthy();
    expect(calculationSource.textContent).toContain("匿名模式仅保留来源分类与核验状态");
    const provenanceTable = within(reportRegion).getByRole("table", { name: "字段来源与核验状态" });
    expect(within(provenanceTable).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "字段",
      "来源类型",
      "算法 / 规则",
      "核验状态",
      "来源引用 / 备注"
    ]);
    expect(within(provenanceTable).getAllByRole("row").length).toBeGreaterThan(1);
    const pillarFacts = within(reportRegion).getByRole("region", { name: "完整四柱事实" });
    for (const pillar of Object.values(firstRevision.facts.pillars)) {
      const pillarCard = within(pillarFacts).getByRole("article", { name: `${pillar.label}完整事实` });
      expect(pillarCard.textContent).toContain(pillar.ganZhi);
      expect(pillarCard.textContent).toContain(pillar.stemTenGod);
      expect(pillarCard.textContent).toContain(pillar.hiddenStems.join("、"));
      expect(pillarCard.textContent).toContain(pillar.branchTenGods.join("、"));
      expect(pillarCard.textContent).toContain(pillar.wuXing);
      expect(pillarCard.textContent).toContain(pillar.nayin);
      expect(pillarCard.textContent).toContain(pillar.twelveGrowth);
      expect(pillarCard.textContent).toContain(pillar.xun);
      expect(pillarCard.textContent).toContain(pillar.voidBranches);
    }
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "下载摘要 PNG" }));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(reportRegion);
    expect(dialog.textContent).toContain("第 1 版 · 历史修订");
    expect(dialog.textContent).toContain(firstRevision.facts.pillars.day.ganZhi);
    expect(dialog.textContent).not.toContain("09:26（exact_minute）");

    fireEvent.click(screen.getByRole("button", { name: "打印 / 保存 PDF" }));
    await waitFor(() => expect(printReportMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "下载摘要 PNG" }));
    await waitFor(() => expect(toBlobMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/png" }),
      "hakimi-chart-r1-anonymous-summary.png"
    ));
    expect(document.querySelector(".single-chart-png-stage")).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /单盘报告预览/ })).toBeNull();
    expect(document.activeElement).toBe(previewButton);
  });

  it("在真实仓储中由匿名切换到完整模式时只展示历史 R1 的引用与权利边界", async () => {
    const firstChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const first = await caseRepository.createCase({ alias: "完整模式历史单盘", calculated: firstChart });
    const firstRevision = first.revisions[0];
    const firstReceipt = await createRevisionCalculationReceipt(
      firstRevision,
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
      {
        id: crypto.randomUUID(),
        createdAt: firstRevision.createdAt,
        captureKind: "revision_creation_baseline"
      }
    );
    const updated = await caseRepository.addRevision(
      first.caseRecord.id,
      await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );
    const secondRevision = updated.revisions[1];
    const source = "# 单盘引用\nR1 精确引用原文。\nR2 专属引用原文。";
    const knowledgeDocument = await knowledgeRepository.createDocument({
      title: "历史修订引用资料",
      author: "测试研究者",
      edition: "本地测试版",
      sourceNote: "只用于完整模式集成测试",
      sourceUrl: "https://example.test/historical-revision",
      publisher: "测试出版者",
      publicationYear: 2026,
      fileName: "historical-revision.md",
      format: "markdown",
      content: source,
      byteSize: new TextEncoder().encode(source).byteLength
    });
    await knowledgeRepository.createCitation({
      documentId: knowledgeDocument.id,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      annotation: "仅属于 R1",
      targets: [{
        kind: "chart_field",
        caseId: first.caseRecord.id,
        revisionId: firstRevision.id,
        field: "pillars.day.ganZhi"
      }]
    });
    await knowledgeRepository.createCitation({
      documentId: knowledgeDocument.id,
      locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
      annotation: "仅属于 R2",
      targets: [{
        kind: "chart_field",
        caseId: first.caseRecord.id,
        revisionId: secondRevision.id,
        field: "pillars.day.ganZhi"
      }]
    });

    const readSnapshot = caseRepository.readSingleChartExportSnapshot.bind(caseRepository);
    vi.spyOn(caseRepository, "readSingleChartExportSnapshot").mockImplementation(async (caseId, revisionId) => {
      const snapshot = await readSnapshot(caseId, revisionId);
      return {
        ...snapshot,
        revisionCalculationReceiptLedgerStatus: "available",
        revisionCalculationReceipts: revisionId === firstRevision.id ? [firstReceipt] : []
      };
    });

    render(
      <ResearchJournal
        caseId={first.caseRecord.id}
        revision={firstRevision}
        selection={{ pillar: "day", field: "stem" }}
      />
    );
    await screen.findByText("还没有研究笔记。");

    const anonymizedToggle = screen.getByRole("checkbox", { name: /匿名导出/ });
    expect((anonymizedToggle as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
    let dialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
    expect(dialog.textContent).toContain("第 1 版 · 历史修订");
    expect(dialog.textContent).toContain("08:26（exact_minute）");
    expect(dialog.textContent).not.toContain("完整模式历史单盘");
    expect(dialog.textContent).not.toContain("历史修订引用资料");
    expect(dialog.textContent).not.toContain("R1 精确引用原文。");
    expect(dialog.textContent).not.toContain("R2 专属引用原文。");
    expect(dialog.textContent).not.toContain("user_unverified");
    expect(dialog.textContent).not.toContain("local_private_only");
    expect(dialog.textContent).not.toContain("09:26（exact_minute）");
    const anonymousSource = within(dialog).getByRole("region", { name: "下游计算来源" });
    expect(anonymousSource.textContent).toContain("已保存计算收据");
    expect(anonymousSource.textContent).not.toContain(firstReceipt.id);
    expect(anonymousSource.textContent).not.toContain(firstReceipt.receiptDigest);

    fireEvent.click(screen.getByRole("button", { name: "关闭单盘报告预览" }));
    fireEvent.click(anonymizedToggle);
    expect((anonymizedToggle as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText("包含敏感资料")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
    dialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });

    expect(dialog.textContent).toContain("第 1 版 · 历史修订");
    expect(dialog.textContent).toContain(firstRevision.id);
    expect(dialog.textContent).toContain("完整模式历史单盘");
    expect(dialog.textContent).toContain("历史修订引用资料");
    expect(dialog.textContent).toContain("R1 精确引用原文。");
    expect(dialog.textContent).toContain("用户候选");
    expect(dialog.querySelector(".single-chart-citation--user_candidate")).not.toBeNull();
    expect(dialog.textContent).toContain("命盘字段 pillars.day.ganZhi");
    expect(dialog.textContent).toContain("user_unverified · unknown · unknown");
    expect(dialog.textContent).toContain("local_private_only · unreviewed · 0 人");
    expect(dialog.textContent).toContain("08:26（exact_minute）");
    expect(dialog.textContent).not.toContain("R2 专属引用原文。");
    expect(dialog.textContent).not.toContain("仅属于 R2");
    expect(dialog.textContent).not.toContain("09:26（exact_minute）");
    const completeSource = within(dialog).getByRole("region", { name: "下游计算来源" });
    expect(completeSource.textContent).toContain("已保存计算收据");
    expect(completeSource.textContent).toContain("精确复演一致");
    expect(within(completeSource).getByText("查看完整本地摘要")).toBeTruthy();
    for (const completeSourceValue of [
      firstReceipt.id,
      firstReceipt.requestFingerprint,
      firstReceipt.receiptDigest,
      firstReceipt.projection.projectionDigest,
      firstReceipt.createdAt
    ]) {
      expect(completeSource.textContent).toContain(completeSourceValue);
    }
    if (firstReceipt.projection.relations.status === "projected") {
      expect(completeSource.textContent).toContain(firstReceipt.projection.relations.resultDigest);
    }
  });

  it("快照仍在读取时禁用匿名模式切换，并在当前预览完成后恢复", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "延迟快照样本", calculated });
    const revision = bundle.revisions[0];
    const snapshot = await caseRepository.readSingleChartExportSnapshot(bundle.caseRecord.id, revision.id);
    let resolveSnapshot!: (value: typeof snapshot) => void;
    const delayedSnapshot = new Promise<typeof snapshot>((resolve) => { resolveSnapshot = resolve; });
    const snapshotSpy = vi.spyOn(caseRepository, "readSingleChartExportSnapshot").mockReturnValue(delayedSnapshot);

    try {
      render(
        <ResearchJournal
          caseId={bundle.caseRecord.id}
          revision={revision}
          selection={{ pillar: "day", field: "stem" }}
        />
      );
      await screen.findByText("还没有研究笔记。");

      const anonymizedToggle = screen.getByRole("checkbox", { name: /匿名导出/ }) as HTMLInputElement;
      expect(anonymizedToggle.disabled).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));

      await waitFor(() => expect(anonymizedToggle.disabled).toBe(true));
      expect(screen.queryByRole("dialog", { name: /单盘报告预览/ })).toBeNull();
      resolveSnapshot(snapshot);

      expect(await screen.findByRole("dialog", { name: /单盘报告预览/ })).toBeTruthy();
      await waitFor(() => expect(anonymizedToggle.disabled).toBe(false));
      expect(snapshotSpy).toHaveBeenCalledWith(bundle.caseRecord.id, revision.id);
    } finally {
      snapshotSpy.mockRestore();
    }
  });

  it("切换精确修订时卸载旧报告作用域，并忽略迟到的旧修订预览", async () => {
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await caseRepository.createCase({ alias: "报告作用域切换", calculated });
    const firstRevision = bundle.revisions[0];
    const updated = await caseRepository.addRevision(
      bundle.caseRecord.id,
      await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );
    const secondRevision = updated.revisions[1];
    const firstSnapshot = await caseRepository.readSingleChartExportSnapshot(bundle.caseRecord.id, firstRevision.id);
    const secondSnapshot = await caseRepository.readSingleChartExportSnapshot(bundle.caseRecord.id, secondRevision.id);
    let resolveFirstSnapshot!: (value: typeof firstSnapshot) => void;
    const delayedFirstSnapshot = new Promise<typeof firstSnapshot>((resolve) => { resolveFirstSnapshot = resolve; });
    const snapshotSpy = vi.spyOn(caseRepository, "readSingleChartExportSnapshot").mockImplementation(
      async (_caseId, revisionId) => revisionId === firstRevision.id ? delayedFirstSnapshot : secondSnapshot
    );

    try {
      const { rerender } = render(
        <ResearchJournal
          caseId={bundle.caseRecord.id}
          revision={firstRevision}
          selection={{ pillar: "day", field: "stem" }}
        />
      );
      await screen.findByText("还没有研究笔记。");
      fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
      await waitFor(() => expect((screen.getByRole("checkbox", { name: /匿名导出/ }) as HTMLInputElement).disabled).toBe(true));

      rerender(
        <ResearchJournal
          caseId={bundle.caseRecord.id}
          revision={secondRevision}
          selection={{ pillar: "day", field: "stem" }}
        />
      );
      const currentToggle = screen.getByRole("checkbox", { name: /匿名导出/ }) as HTMLInputElement;
      expect(currentToggle.disabled).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "预览 PNG / PDF" }));
      const dialog = await screen.findByRole("dialog", { name: /单盘报告预览/ });
      expect(dialog.textContent).toContain("09:26（exact_minute）");
      expect(dialog.textContent).not.toContain("08:26（exact_minute）");

      resolveFirstSnapshot(firstSnapshot);
      await waitFor(() => {
        expect(dialog.textContent).toContain("09:26（exact_minute）");
        expect(dialog.textContent).not.toContain("08:26（exact_minute）");
      });
    } finally {
      snapshotSpy.mockRestore();
    }
  });

  it("候选组只创建案例级笔记与 revisionId=null 的事件", async () => {
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const record = await caseRepository.createCandidateSet({ alias: "未知时辰研究样本", candidateSet });

    render(<ResearchJournal caseId={record.id} revision={null} />);

    expect(await screen.findByText("还没有研究笔记。")).toBeTruthy();
    expect(screen.getByText(/只允许案例级锚点/)).toBeTruthy();
    expect(screen.queryByLabelText("锚定位置")).toBeNull();
    expect(screen.queryByRole("button", { name: "导出单盘 Markdown" })).toBeNull();
    expect(screen.queryByRole("button", { name: "导出案例研究 CSV" })).toBeNull();

    fireEvent.change(screen.getByLabelText(/Markdown 笔记/), {
      target: { value: "比较十三个探针，不设主盘。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存笔记" }));

    expect(await screen.findByText("案例级研究笔记已保存到候选组。")).toBeTruthy();
    const notes = await researchRepository.listResearchNotesByCase(record.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].anchor).toEqual({ kind: "case" });

    fireEvent.change(screen.getByLabelText(/事件标题/), { target: { value: "家属补充时间线索" } });
    fireEvent.change(screen.getByLabelText("起始日期"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "添加事件" }));

    expect(await screen.findByText("事件已链接到当前候选组；revisionId 保持 null。")).toBeTruthy();
    const events = await researchRepository.listEventsByCase(record.id);
    expect(events).toHaveLength(1);
    expect(events[0].revisionId).toBeNull();
    expect(events[0].transitNodeRef).toBeNull();
  });
});
