import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput, RulePackBinding } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { withDayBoundaryFromProfile, WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { ComparePage } from "./compare-page";

const baseInput: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "2024-02-04",
  time: "23:30",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

const ORIGINAL_INNER_WIDTH = window.innerWidth;

async function createFormalCaseFromInput(alias: string, input: BirthInput, rulePackBinding?: RulePackBinding) {
  const chart = await calculateChart(
    input,
    WORKING_DEFAULT_RULE_PROFILE,
    rulePackBinding ? { rulePackBinding } : undefined
  );
  return caseRepository.createCase({ alias, calculated: chart });
}

async function createFormalCase(alias: string, dayOffset = 0, rulePackBinding?: RulePackBinding) {
  const input: BirthInput = {
    ...baseInput,
    date: `2024-02-${String(4 + dayOffset).padStart(2, "0")}`
  };
  return createFormalCaseFromInput(alias, input, rulePackBinding);
}

async function installedRulePackBinding(): Promise<RulePackBinding> {
  return {
    kind: "installed_rule_pack",
    packId: "web-comparison-pack",
    packDigest: "2".repeat(64),
    profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
    profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
    profileDigest: await sha256Hex(WORKING_DEFAULT_RULE_PROFILE),
    useMode: "exact"
  };
}

function exactComparisonUrl(
  items: Array<{ caseId: string; revisionId: string }>,
  at = "2026-08-01T12:30:00.000Z"
) {
  const params = new URLSearchParams();
  for (const item of items) {
    params.append("item", `revision:${item.caseId}:${item.revisionId}`);
  }
  params.set("at", at);
  return `/compare?${params.toString()}`;
}

beforeEach(async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  await caseRepository.clearAll();
  document.documentElement.dataset.appBootReady = "true";
  window.history.replaceState({}, "", "/compare");
  window.scrollTo = vi.fn();
});

afterEach(async () => {
  await caseRepository.clearAll();
  delete document.documentElement.dataset.appBootReady;
  window.history.replaceState({}, "", "/compare");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: ORIGINAL_INNER_WIDTH });
});

describe("ComparePage", () => {
  it("冷启动自检未确认时不会把空白入口改写为新的瞬时点地址", async () => {
    document.documentElement.dataset.appBootReady = "false";

    render(<ComparePage />);

    expect(await screen.findByRole("heading", { name: "正式命盘对照台" })).toBeTruthy();
    await screen.findByRole("heading", { name: "先保存两个正式命盘" });
    expect(`${window.location.pathname}${window.location.search}`).toBe("/compare");
  });

  it("把案例索引读取和投影计算分别暴露为可播报状态", async () => {
    const [first, second] = await Promise.all([
      createFormalCase("加载状态甲", 0),
      createFormalCase("加载状态乙", 1)
    ]);
    window.history.replaceState({}, "", exactComparisonUrl([
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ]));

    const listCases = caseRepository.listCases.bind(caseRepository);
    const readSources = caseRepository.readFormalComparisonSources.bind(caseRepository);
    let releaseLibrary!: () => void;
    let releaseProjection!: () => void;
    const libraryGate = new Promise<void>((resolve) => { releaseLibrary = resolve; });
    const projectionGate = new Promise<void>((resolve) => { releaseProjection = resolve; });
    const listSpy = vi.spyOn(caseRepository, "listCases").mockImplementation(async () => {
      await libraryGate;
      return listCases();
    });
    const sourcesSpy = vi.spyOn(caseRepository, "readFormalComparisonSources").mockImplementation(async (request) => {
      await projectionGate;
      return readSources(request);
    });

    try {
      render(<ComparePage />);

      const libraryStatus = screen.getByText("正在读取案例索引");
      expect(libraryStatus.closest('[role="status"]')).not.toBeNull();
      releaseLibrary();
      const projectionStatus = await screen.findByText("正在验签修订并同步计算运限");
      expect(projectionStatus.closest('[role="status"]')).not.toBeNull();

      releaseProjection();
      expect(await screen.findByRole(
        "region",
        { name: "正式命盘字段对照表" },
        { timeout: 10_000 }
      )).toBeTruthy();
    } finally {
      releaseLibrary();
      releaseProjection();
      listSpy.mockRestore();
      sourcesSpy.mockRestore();
    }
  }, 15_000);

  it("空白入口不会把最新案例自动当成正式对照来源", async () => {
    await createFormalCase("仅供手动选择");

    render(<ComparePage />);

    const caseSelect = await screen.findByRole("combobox", { name: "对照位 A 案例" });
    expect((caseSelect as HTMLSelectElement).value).toBe("");
    expect(within(caseSelect).getByRole("option", { name: "仅供手动选择 · 1 修订" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "正式命盘字段对照表" })).toBeNull();
  });

  it("精确历史 Revision 可派生并保存相反换日规则，且不会改写原修订", async () => {
    const bundle = await createFormalCase("换日对照样本");
    const original = bundle.revisions[0];
    const originalHash = original.manifest.resultHash;
    const existingAlternate = await calculateChart(
      original.input,
      withDayBoundaryFromProfile(original.ruleProfile, "midnight")
    );
    await caseRepository.addRevision(bundle.caseRecord.id, existingAlternate);
    window.history.replaceState(
      {},
      "",
      `/compare?case=${bundle.caseRecord.id}&revision=${original.id}&at=2026-08-01T12%3A30%3A00.000Z`
    );

    render(<ComparePage />);

    const revisionSelect = await screen.findByRole("combobox", { name: "对照位 A 修订" });
    expect((revisionSelect as HTMLSelectElement).value).toBe(original.id);
    fireEvent.click(screen.getByRole("button", { name: "生成并保存相反换日修订" }));

    const matrix = await screen.findByRole(
      "region",
      { name: "正式命盘字段对照表" },
      { timeout: 5_000 }
    );
    expect(matrix.querySelectorAll("thead th")).toHaveLength(3);
    await waitFor(async () => {
      const updated = await caseRepository.getCase(bundle.caseRecord.id);
      expect(updated?.caseRecord.revisionCount).toBe(3);
      expect(updated?.revisions[0].manifest.resultHash).toBe(originalHash);
      expect(updated?.revisions[2].ruleProfile.calendar.dayBoundary).toBe("midnight");
    });
    expect(window.location.search).toContain(`revision%3A${bundle.caseRecord.id}%3A${original.id}`);
  });

  it.each([2, 3, 4])("从 URL 精确恢复 %i 个正式 Revision 并对齐全部字段", async (count) => {
    const bundles = await Promise.all(
      Array.from({ length: count }, (_, index) => createFormalCase(`正式样本${index + 1}`, index))
    );
    const items = bundles.map((bundle) => ({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id
    }));
    window.history.replaceState({}, "", exactComparisonUrl(items));

    render(<ComparePage />);

    const matrix = await screen.findByRole(
      "region",
      { name: "正式命盘字段对照表" },
      { timeout: 5_000 }
    );
    expect(matrix.querySelectorAll("thead th")).toHaveLength(count + 1);
    expect(matrix.querySelectorAll("tbody tr[data-field-id]")).toHaveLength(96);
    for (const row of matrix.querySelectorAll("tbody tr[data-field-id]")) {
      expect(row.querySelectorAll("td")).toHaveLength(count);
    }
    bundles.forEach((bundle, index) => {
      const revision = bundle.revisions[0];
      expect(within(matrix).getByRole("columnheader", { name: new RegExp(bundle.caseRecord.alias) })).toBeTruthy();
      expect(window.location.search).toContain(
        encodeURIComponent(`revision:${bundle.caseRecord.id}:${revision.id}`)
      );
      const slot = ["A", "B", "C", "D"][index];
      expect(screen.getByRole("link", {
        name: `研读对照位 ${slot}：${bundle.caseRecord.alias} · Revision ${revision.revisionNumber}`
      }).getAttribute("href")).toBe(
        `/cases/${bundle.caseRecord.id}/revisions/${revision.id}?view=research`
      );
    });
  });

  it("窄屏按当前 A–B/C/D 重算差异与筛选，并把非默认活动盘写入链接", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const [first, second, third, fourth] = await Promise.all([
      createFormalCaseFromInput("窄屏基准甲", { ...baseInput, sex: "male" }),
      createFormalCaseFromInput("窄屏比较乙", { ...baseInput, sex: "female" }),
      createFormalCaseFromInput("窄屏比较丙", { ...baseInput, sex: "male" }),
      createFormalCaseFromInput("窄屏比较丁", { ...baseInput, sex: "female" })
    ]);
    const items = [first, second, third, fourth].map((bundle) => ({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id
    }));
    window.history.replaceState({}, "", `${exactComparisonUrl(items)}&focus=C`);
    const sourcesSpy = vi.spyOn(caseRepository, "readFormalComparisonSources");

    try {
      render(<ComparePage />);

      const matrix = await screen.findByRole("region", { name: "正式命盘字段对照表" });
      expect(matrix.dataset.differenceScope).toBe("active_pair");
      expect(screen.getByRole("heading", { name: /A ↔ C：/ })).toBeTruthy();
      expect(screen.getByText(/A · 窄屏基准甲 · R1 ↔ 当前 C · 窄屏比较丙 · R1/)).toBeTruthy();
      expect(screen.getByRole("button", { name: "C · 窄屏比较丙" }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("link", {
        name: "从当前身份区研读 A：窄屏基准甲 · Revision 1"
      }).getAttribute("href")).toBe(
        `/cases/${first.caseRecord.id}/revisions/${first.revisions[0].id}?view=research`
      );
      expect(screen.getByRole("link", {
        name: "从当前身份区研读 C：窄屏比较丙 · Revision 1"
      }).getAttribute("href")).toBe(
        `/cases/${third.caseRecord.id}/revisions/${third.revisions[0].id}?view=research`
      );
      const originalProjectionCalls = sourcesSpy.mock.calls.length;
      const resultHash = document.querySelector<HTMLElement>(".comparison-evidence-footer code")?.textContent;
      expect(resultHash).toMatch(/^[a-f0-9]{64}$/);

      const pillarLink = screen.getByRole("link", { name: /四柱/ });
      const historyPushSpy = vi.spyOn(window.history, "pushState");
      fireEvent.click(pillarLink);
      expect(window.location.hash).toBe("#compare-section-pillar_fact");
      fireEvent.click(pillarLink);
      expect(historyPushSpy).toHaveBeenCalledTimes(1);
      historyPushSpy.mockRestore();

      const sexRow = matrix.querySelector<HTMLElement>('[data-field-id="input.sex"]');
      expect(sexRow?.querySelector("th")?.textContent).toContain("相同");
      const differencesOnly = screen.getByRole("checkbox", { name: "只看当前 A–C 变化的字段" });
      fireEvent.click(differencesOnly);
      expect(matrix.querySelector('[data-field-id="input.sex"]')).toBeNull();
      expect(within(screen.getByRole("navigation", { name: "跳到差异分组" }))
        .queryByRole("link", { name: /四柱/ })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "D · 窄屏比较丁" }));
      await waitFor(() => {
        expect(new URLSearchParams(window.location.search).get("focus")).toBe("D");
        expect(window.location.hash).toBe("#compare-section-pillar_fact");
        expect(matrix.querySelector('[data-field-id="input.sex"]')).not.toBeNull();
      });
      expect(matrix.querySelector('[data-field-id="input.sex"] th')?.textContent).toContain("变化");
      expect(screen.getByRole("checkbox", { name: "只看当前 A–D 变化的字段" })).toBeTruthy();
      expect(screen.getByRole("link", {
        name: "从当前身份区研读 D：窄屏比较丁 · Revision 1"
      }).getAttribute("href")).toBe(
        `/cases/${fourth.caseRecord.id}/revisions/${fourth.revisions[0].id}?view=research`
      );

      fireEvent.click(screen.getByRole("button", { name: "B · 窄屏比较乙" }));
      await waitFor(() => expect(new URLSearchParams(window.location.search).has("focus")).toBe(false));
      expect(screen.getByRole("button", { name: "B · 窄屏比较乙" }).getAttribute("aria-pressed")).toBe("true");
      expect(sourcesSpy).toHaveBeenCalledTimes(originalProjectionCalls);
      expect(document.querySelector<HTMLElement>(".comparison-evidence-footer code")?.textContent).toBe(resultHash);
    } finally {
      sourcesSpy.mockRestore();
    }
  }, 15_000);

  it("删除活动 D/C 时按剩余槽位规范化焦点，不产生悬空链接或错误", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const bundles = await Promise.all(
      Array.from({ length: 4 }, (_, index) => createFormalCase(`焦点收缩样本${index + 1}`, index))
    );
    const items = bundles.map((bundle) => ({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id
    }));
    window.history.replaceState({}, "", `${exactComparisonUrl(items)}&focus=D`);

    render(<ComparePage />);

    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    expect(screen.getByRole("button", { name: "D · 焦点收缩样本4" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "移除对照位 D" }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("focus")).toBe("C");
      expect(screen.getByRole("button", { name: "C · 焦点收缩样本3" }).getAttribute("aria-pressed")).toBe("true");
    });
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "移除对照位 C" }));
    await waitFor(() => expect(new URLSearchParams(window.location.search).has("focus")).toBe(false));
    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    const twoChartIdentity = screen.getByRole("group", { name: "选择当前比较盘" });
    expect(twoChartIdentity.textContent).toContain("A · 焦点收缩样本1 · R1 ↔ 当前 B · 焦点收缩样本2 · R1");
    expect(within(twoChartIdentity).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  }, 15_000);

  it("窄屏两盘在长表之外保留 A/B 的 Revision 与 RuleProfile 身份", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const [first, second] = await Promise.all([
      createFormalCase("两盘身份甲", 0),
      createFormalCase("两盘身份乙", 1)
    ]);
    window.history.replaceState({}, "", exactComparisonUrl([
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ]));

    render(<ComparePage />);

    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    const identity = screen.getByRole("group", { name: "选择当前比较盘" });
    expect(identity.textContent).toContain("A · 两盘身份甲 · R1 ↔ 当前 B · 两盘身份乙 · R1");
    expect(identity.textContent).toContain("A ziping-working-default@0.1.0 · B ziping-working-default@0.1.0");
    expect(within(identity).queryByRole("button")).toBeNull();
  });

  it("中间槽清空时保留最后一个完整 URL，不压缩槽位或改变 focus 指向", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const bundles = await Promise.all(
      Array.from({ length: 4 }, (_, index) => createFormalCase(`中间空槽样本${index + 1}`, index))
    );
    const items = bundles.map((bundle) => ({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id
    }));
    const requestedRoute = `${exactComparisonUrl(items)}&focus=C`;
    window.history.replaceState({}, "", requestedRoute);

    render(<ComparePage />);

    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    const middleCase = screen.getByRole("combobox", { name: "对照位 B 案例" });
    fireEvent.change(middleCase, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "正式命盘字段对照表" })).toBeNull();
    });
    expect(`${window.location.pathname}${window.location.search}`).toBe(requestedRoute);
    expect(new URLSearchParams(window.location.search).getAll("item")).toEqual(
      items.map((item) => `revision:${item.caseId}:${item.revisionId}`)
    );
    expect(new URLSearchParams(window.location.search).get("focus")).toBe("C");

    fireEvent.change(middleCase, { target: { value: bundles[1].caseRecord.id } });
    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    await waitFor(() => expect(`${window.location.pathname}${window.location.search}`).toBe(requestedRoute));
  }, 15_000);

  it("在选择卡、表头和独立字段中显示精确规则包来源，未绑定修订不冒充规则包", async () => {
    const binding = await installedRulePackBinding();
    const [bound, unbound] = await Promise.all([
      createFormalCase("绑定规则包盘", 0, binding),
      createFormalCase("内置规则盘", 1)
    ]);
    window.history.replaceState({}, "", exactComparisonUrl([
      { caseId: bound.caseRecord.id, revisionId: bound.revisions[0].id },
      { caseId: unbound.caseRecord.id, revisionId: unbound.revisions[0].id }
    ]));

    render(<ComparePage />);

    const matrix = await screen.findByRole(
      "region",
      { name: "正式命盘字段对照表" },
      { timeout: 5_000 }
    );
    const rows = new Map(Array.from(matrix.querySelectorAll<HTMLTableRowElement>("tbody tr[data-field-id]"))
      .map((row) => [row.dataset.fieldId, row]));

    expect(rows.get("rule.profile")?.textContent).toContain("RuleProfile 配置快照");
    expect(rows.get("rule.digest")?.textContent).toContain("RuleProfile 摘要");
    expect(rows.get("rule.pack_source")?.textContent).toContain("installed_rule_pack");
    expect(rows.get("rule.pack_source")?.textContent).toContain("内置 / 未绑定规则快照");
    expect(rows.get("rule.pack_id")?.textContent).toContain(binding.packId);
    expect(rows.get("rule.pack_digest")?.textContent).toContain(binding.packDigest);
    expect(rows.get("rule.pack_profile_id")?.textContent).toContain(binding.profileId);
    expect(rows.get("rule.pack_profile_version")?.textContent).toContain(binding.profileVersion);
    expect(rows.get("rule.pack_profile_digest")?.textContent).toContain(binding.profileDigest);
    expect(rows.get("rule.pack_use_mode")?.textContent).toContain(binding.useMode);

    const boundHeader = within(matrix).getByRole("columnheader", { name: /绑定规则包盘/ });
    const unboundHeader = within(matrix).getByRole("columnheader", { name: /内置规则盘/ });
    expect(boundHeader.textContent).toContain(`规则包 ${binding.packId} · exact`);
    expect(unboundHeader.textContent).toContain("内置 / 未绑定规则快照");
    const selectionRegion = screen.getByRole("group", { name: "正式命盘对照位" });
    expect(selectionRegion.textContent).toContain(`${binding.packId} · exact`);
    expect(selectionRegion.textContent).toContain("内置 / 未绑定规则快照");
  });

  it("以同一个 UTC 瞬时点生成六层运限，并将瞬时点保存在链接中", async () => {
    const [first, second] = await Promise.all([
      createFormalCase("同步甲", 0),
      createFormalCase("同步乙", 1)
    ]);
    window.history.replaceState({}, "", exactComparisonUrl([
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ]));

    render(<ComparePage />);

    const transit = await screen.findByRole("region", { name: "同一瞬时点六层运限对照" });
    for (const track of ["dayun", "xiaoyun", "year", "month", "day", "hour"]) {
      const row = transit.querySelector(`[data-field-id="transit.${track}"]`);
      expect(row).not.toBeNull();
      expect(row?.querySelectorAll("td")).toHaveLength(2);
    }
    expect(screen.getByText("2026-08-01T12:30:00.000Z")).toBeTruthy();
    expect(new URLSearchParams(window.location.search).get("at")).toBe("2026-08-01T12:30:00.000Z");
  });

  it("未指定性别时把人工顺逆纳入正式对照链接并可精确恢复", async () => {
    const unspecifiedChart = await calculateChart(
      { ...baseInput, sex: "unspecified" },
      WORKING_DEFAULT_RULE_PROFILE
    );
    const unspecified = await caseRepository.createCase({ alias: "人工顺逆样本", calculated: unspecifiedChart });
    const second = await createFormalCase("人工顺逆参照", 1);
    const path = `${exactComparisonUrl([
      { caseId: unspecified.caseRecord.id, revisionId: unspecified.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ])}&dir=A%3Abackward`;
    window.history.replaceState({}, "", path);

    render(<ComparePage />);

    const direction = await screen.findByRole("combobox", { name: "对照位 A 人工顺逆" });
    expect((direction as HTMLSelectElement).value).toBe("backward");
    await screen.findByRole("region", { name: "正式命盘字段对照表" });
    expect(new URLSearchParams(window.location.search).getAll("dir")).toEqual(["A:backward"]);
  });

  it("链接指向不存在的精确 Revision 时明确拒绝，且不替换成最新修订", async () => {
    const bundle = await createFormalCase("仍有最新修订");
    const missingRevisionId = crypto.randomUUID();
    window.history.replaceState(
      {},
      "",
      exactComparisonUrl([{ caseId: bundle.caseRecord.id, revisionId: missingRevisionId }])
    );

    render(<ComparePage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(`修订 ${missingRevisionId} 已不存在`);
    expect(alert.textContent).toContain("未静默替换为最新修订");
    expect(screen.queryByRole("region", { name: "正式命盘字段对照表" })).toBeNull();
  });

  it.each([
    {
      label: "含一个损坏 item",
      route: (caseId: string, revisionId: string) =>
        `/compare?item=${encodeURIComponent(`revision:${caseId}:${revisionId}`)}&item=broken&at=2026-08-01T12%3A30%3A00.000Z`,
      message: "第 2 个 item 不是确切"
    },
    {
      label: "包含第五个 item",
      route: () => {
        const params = new URLSearchParams();
        for (let index = 0; index < 5; index += 1) {
          params.append("item", `revision:${crypto.randomUUID()}:${crypto.randomUUID()}`);
        }
        params.set("at", "2026-08-01T12:30:00.000Z");
        return `/compare?${params.toString()}`;
      },
      message: "最多只能包含四个确切 Revision"
    },
    {
      label: "包含非法 at",
      route: (caseId: string, revisionId: string) =>
        `/compare?item=${encodeURIComponent(`revision:${caseId}:${revisionId}`)}&at=2026-02-30T12%3A30%3A00.000Z`,
      message: "at 必须是精确到分钟的规范 UTC"
    },
    {
      label: "包含悬空 focus",
      route: (caseId: string, revisionId: string) =>
        `/compare?item=${encodeURIComponent(`revision:${caseId}:${revisionId}`)}&at=2026-08-01T12%3A30%3A00.000Z&focus=D`,
      message: "尚未选择的对照位 D"
    }
  ])("$label 时整条正式对照链接失败关闭且保留原 URL", async ({ route, message }) => {
    const bundle = await createFormalCase("失败关闭样本");
    const requestedRoute = route(bundle.caseRecord.id, bundle.revisions[0].id);
    window.history.replaceState({}, "", requestedRoute);
    const sourcesSpy = vi.spyOn(caseRepository, "readFormalComparisonSources");

    try {
      render(<ComparePage />);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain(message);
      expect(`${window.location.pathname}${window.location.search}`).toBe(requestedRoute);
      expect(screen.queryByRole("region", { name: "正式命盘字段对照表" })).toBeNull();
      expect(sourcesSpy).not.toHaveBeenCalled();
    } finally {
      sourcesSpy.mockRestore();
    }
  });

  it("旧版 case-only 链接明确拒绝，不自动选择 latest Revision", async () => {
    const bundle = await createFormalCase("不得猜测 latest");
    const requestedRoute = `/compare?case=${bundle.caseRecord.id}`;
    window.history.replaceState({}, "", requestedRoute);
    const sourcesSpy = vi.spyOn(caseRepository, "readFormalComparisonSources");

    try {
      render(<ComparePage />);

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("未回退到最新修订");
      const caseSelect = screen.getByRole("combobox", { name: "对照位 A 案例" }) as HTMLSelectElement;
      expect(caseSelect.value).toBe("");
      expect(`${window.location.pathname}${window.location.search}`).toBe(requestedRoute);
      expect(sourcesSpy).not.toHaveBeenCalled();
    } finally {
      sourcesSpy.mockRestore();
    }
  });

  it("精确旧版 case/revision 链接通过来源验证后迁移为 canonical item", async () => {
    const bundle = await createFormalCase("旧链接迁移样本");
    const revision = bundle.revisions[0];
    window.history.replaceState(
      {},
      "",
      `/compare?case=${bundle.caseRecord.id}&revision=${revision.id}&at=2026-08-01T12%3A30%3A00.000Z`
    );

    render(<ComparePage />);

    const revisionSelect = await screen.findByRole("combobox", { name: "对照位 A 修订" });
    expect((revisionSelect as HTMLSelectElement).value).toBe(revision.id);
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.getAll("item")).toEqual([`revision:${bundle.caseRecord.id}:${revision.id}`]);
      expect(params.has("case")).toBe(false);
      expect(params.has("revision")).toBe(false);
    });
  });
});
