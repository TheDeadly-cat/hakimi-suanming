import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BirthInput, RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { BaziInterpretationPanel, BaziInterpretationSummary } from "./bazi-interpretation-panel";

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

async function revisionFor(birth: BirthInput): Promise<RevisionRecord> {
  const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-12T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    facts: chart.facts,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    manifest: chart.manifest
  };
}

describe("BaziInterpretationPanel", () => {
  it("puts a direct interpretation entry on the default structure view", async () => {
    const revision = await revisionFor(input);
    const { container } = render(<BaziInterpretationSummary revision={revision} />);

    expect(screen.getByRole("heading", { name: "本盘解读已生成" })).toBeTruthy();
    expect(screen.getByText(/按固定四步阅读.*不选全盘第一主题/)).toBeTruthy();
    const summary = container.querySelector<HTMLElement>(".interpretation-entry-summary");
    expect(summary?.dataset).toMatchObject({
      firstReadVersion: "hakimi.bazi.first_read_review/0.1.0",
      selectedPrimaryTheme: "null",
      overallGoodBad: "null",
      result: "null"
    });
    const firstReadSteps = [
      ...screen.getByRole("list", { name: "八字整盘首读四步" })
        .querySelectorAll<HTMLElement>(":scope > li")
    ];
    expect(firstReadSteps).toHaveLength(4);
    expect(firstReadSteps.map((step) => step.getAttribute("data-step-id"))).toEqual([
      "strength_confidence",
      "pillar_ten_gods",
      "repeated_ten_gods",
      "shensha_gate"
    ]);
    expect(screen.getByText("默认关闭 · 待主动打开")).toBeTruthy();
    expect(screen.getByRole("link", { name: "打开完整八字解读与研究预览" }).getAttribute("href")).toBe(
      `/cases/${revision.caseId}/revisions/${revision.id}?view=overview`
    );
  });

  it("renders a direct strength candidate, factor ledger, four position readings and sources", async () => {
    const { container } = render(<BaziInterpretationPanel revision={await revisionFor(input)} />);

    expect(screen.getByRole("heading", { name: "旺衰与十神解读" })).toBeTruthy();
    const firstRead = container.querySelector<HTMLElement>(".bazi-first-read-review");
    expect(firstRead?.dataset).toMatchObject({
      firstReadVersion: "hakimi.bazi.first_read_review/0.1.0",
      orderPolicy: "fixed_not_ranked",
      selectedPrimaryTheme: "null",
      expertFirstReadVerdict: "null",
      overallGoodBad: "null",
      result: "null"
    });
    const firstReadSteps = [...firstRead!.querySelectorAll<HTMLElement>(":scope > .bazi-first-read-steps > li")];
    expect(firstReadSteps).toHaveLength(4);
    expect(firstReadSteps.map((step) => [step.dataset.order, step.dataset.stepId])).toEqual([
      ["1", "strength_confidence"],
      ["2", "pillar_ten_gods"],
      ["3", "repeated_ten_gods"],
      ["4", "shensha_gate"]
    ]);
    expect(firstReadSteps.every((step) => (
      step.dataset.selectedPrimaryTheme === "null"
      && step.dataset.overallGoodBad === "null"
      && step.dataset.result === "null"
    ))).toBe(true);
    expect(firstReadSteps[3].dataset.availability).toBe("not_requested");
    expect(within(firstRead!).getByText(/selected primary:null · expert verdict:null · overall:null · result:null/)).toBeTruthy();
    const themeIndex = screen.getByRole("navigation", { name: "按柱位钻取现有内容" });
    expect(themeIndex.dataset).toMatchObject({
      themeIndexVersion: "hakimi.bazi.theme_index_review/0.1.0",
      filterPolicy: "temporary_client_side_visibility_only",
      orderingPolicy: "fixed_pillar_order_not_ranked",
      activeFilter: "all",
      visibleThemeCount: "5",
      selectedPrimaryTheme: "null",
      expertThemeVerdict: "null",
      ranking: "null",
      overallGoodBad: "null",
      result: "null"
    });
    const themeList = within(themeIndex).getByRole("list", { name: "八字主题索引" });
    const themeCards = [...themeList.querySelectorAll<HTMLElement>(":scope > li")];
    expect(themeCards.map((card) => [
      card.dataset.order,
      card.dataset.themeId,
      card.dataset.availability
    ])).toEqual([
      ["1", "year", "available"],
      ["2", "month", "available"],
      ["3", "day", "available"],
      ["4", "hour", "available"],
      ["5", "shensha", "not_requested"]
    ]);
    expect(themeCards.every((card) => (
      card.dataset.selectedPrimaryTheme === "null"
      && card.dataset.rank === "null"
      && card.dataset.score === "null"
      && card.dataset.overallGoodBad === "null"
      && card.dataset.result === "null"
    ))).toBe(true);
    expect(within(themeIndex).getByRole("link", { name: "先看旺衰因素账" }).getAttribute("href"))
      .toBe("#bazi-strength-ledger");
    expect(within(themeCards[1]).getByRole("link", { name: "查看月柱证据" }).getAttribute("href"))
      .toBe("#bazi-ten-god-month");
    expect(within(themeCards[4]).getByRole("link", { name: "前往显式入口" }).getAttribute("href"))
      .toBe("#bazi-shensha-gate");
    expect(container.querySelector("#bazi-strength-ledger")).not.toBeNull();
    expect(container.querySelector("#bazi-ten-god-month")).not.toBeNull();
    expect(container.querySelector("#bazi-shensha-gate")).not.toBeNull();
    expect(within(themeIndex).getByRole("button", { name: "全部" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(themeIndex).getByRole("button", { name: "月柱" }));
    expect(themeIndex.dataset).toMatchObject({ activeFilter: "month", visibleThemeCount: "1" });
    expect(within(themeIndex).getByRole("button", { name: "月柱" }).getAttribute("aria-pressed")).toBe("true");
    expect([...themeList.querySelectorAll<HTMLElement>(":scope > li")].map((card) => card.dataset.themeId))
      .toEqual(["month"]);
    expect(screen.queryByRole("heading", { name: "本盘神煞命中事实" })).toBeNull();
    fireEvent.click(within(themeIndex).getByRole("button", { name: "全部" }));
    expect(themeIndex.dataset).toMatchObject({ activeFilter: "all", visibleThemeCount: "5" });
    expect(within(container.querySelector<HTMLElement>(".strength-verdict")!)
      .getByText(/日主[甲乙丙丁戊己庚辛壬癸][木火土金水].*（候选）/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "偏助因素" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "泄耗克因素" })).toBeTruthy();
    const sensitivity = container.querySelector<HTMLDetailsElement>(".strength-sensitivity-review");
    expect(sensitivity).not.toBeNull();
    expect(sensitivity?.dataset).toMatchObject({
      expertVerdict: "null",
      selectedOfficialScenario: "null",
      overallGoodBad: "null"
    });
    expect([
      "stable_across_engineering_scenarios",
      "band_sensitive",
      "direction_sensitive",
      "insufficient"
    ]).toContain(sensitivity?.dataset.stability);
    fireEvent.click(within(sensitivity!).getByText("查看旺衰判定敏感性"));
    expect(sensitivity?.open).toBe(true);
    expect(within(sensitivity!).getByText("月令主气重复计权已检出")).toBeTruthy();
    const sensitivityScenarios = [...sensitivity!.querySelectorAll<HTMLElement>(".strength-scenario-grid > article")];
    expect(sensitivityScenarios).toHaveLength(6);
    expect(new Set(sensitivityScenarios.map((scenario) => scenario.dataset.scenarioId)).size).toBe(6);
    expect(sensitivityScenarios.every((scenario) => (
      scenario.dataset.officialRuleCandidate === "false"
      && scenario.dataset.overallGoodBad === "null"
      && scenario.dataset.strengthBand
    ))).toBe(true);
    expect(within(sensitivity!).getByRole("heading", { name: "需要命理专家裁决的 4 个问题" })).toBeTruthy();
    expect(sensitivity!.querySelectorAll(".strength-expert-review-questions li")).toHaveLength(4);
    expect(within(sensitivity!).getByText(/official:null · expert verdict:null · overall:null · result:null/)).toBeTruthy();
    const tenGodSensitivityItems = [...sensitivity!.querySelectorAll<HTMLElement>(".ten-god-sensitivity-matrix li")];
    expect(tenGodSensitivityItems.length).toBeGreaterThan(0);
    expect(tenGodSensitivityItems.every((item) => (
      item.dataset.tenGod
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.dataset.baselineBalanceDirection ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.dataset.effectiveBalanceDirection ?? "")
      && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(item.dataset.directionStability ?? "")
      && item.dataset.selectedOfficialScenario === "null"
      && item.dataset.overallGoodBad === "null"
    ))).toBe(true);
    expect(within(sensitivity!).getByText(/selected official:null · expert orientation:null · overall:null · result:null/)).toBeTruthy();
    const readings = screen.getByRole("list", { name: "四柱十神位置解读" });
    expect(readings.querySelectorAll(":scope > [role='listitem']")).toHaveLength(4);
    expect(within(readings).getAllByText(/六场景|场景不足|时辰未定/).length).toBeGreaterThanOrEqual(4);
    expect(within(readings).getAllByText(/查看 4 道喜忌复核门/)).toHaveLength(4);
    expect(within(readings).getAllByText(/综合喜忌：null · 事件结果：null · 不评分/)).toHaveLength(4);
    const directionCards = [...readings.querySelectorAll<HTMLElement>(":scope > [data-balance-direction]")];
    expect(directionCards).toHaveLength(4);
    expect(directionCards.every((card) => (
      ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(card.dataset.balanceDirection ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(card.dataset.baselineBalanceDirection ?? "")
      && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(card.dataset.directionStability ?? "")
      && (card.dataset.directionStability !== "direction_sensitive" || card.dataset.balanceDirection === "conditional")
      && card.dataset.overallGoodBad === "null"
    ))).toBe(true);
    const occurrenceReviews = [...container.querySelectorAll<HTMLDetailsElement>(".ten-god-occurrence-review")];
    const occurrenceItems = [...container.querySelectorAll<HTMLElement>(".ten-god-occurrence-item")];
    expect(occurrenceReviews).toHaveLength(4);
    expect(occurrenceItems).toHaveLength(14);
    expect(occurrenceItems.every((item) => (
      ["visible_stem", "hidden_stem_main", "hidden_stem_secondary"].includes(item.dataset.source ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.dataset.balanceDirection ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(item.dataset.baselineBalanceDirection ?? "")
      && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(item.dataset.directionStability ?? "")
      && (item.dataset.directionStability !== "direction_sensitive" || item.dataset.balanceDirection === "conditional")
      && item.dataset.result === "null"
      && item.dataset.overallGoodBad === "null"
    ))).toBe(true);
    fireEvent.click(within(occurrenceReviews[0]).getByText(/查看本柱全部 3 项十神/));
    expect(occurrenceReviews[0].open).toBe(true);
    expect(within(occurrenceReviews[0]).getByRole("list", { name: "年柱全部十神出现项" })).toBeTruthy();
    expect(within(occurrenceReviews[0]).getByText(/乙透干 · 首屏焦点/)).toBeTruthy();
    expect(within(occurrenceReviews[0]).getAllByText(/result:null · overall:null/)).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: /《滴天髓阐微》/ }).every((link) => (
      link.getAttribute("href")?.includes("ctext.org")
    ))).toBe(true);
    expect(screen.getAllByRole("link", { name: /《渊海子平》/ }).every((link) => (
      link.getAttribute("href")?.includes("ctext.org")
    ))).toBe(true);
    expect(screen.getAllByText(/从格、专旺、化气/).length).toBeGreaterThan(0);
  });

  it("automatically renders the source-bound v0.18 strength evidence ledger without preparing a current-chart packet", async () => {
    const { container } = render(<BaziInterpretationPanel revision={await revisionFor(input)} />);
    const ledger = container.querySelector<HTMLElement>(".bazi-strength-evidence-ledger");

    expect(ledger).toBeTruthy();
    await waitFor(() => {
      expect(ledger?.dataset.bindingState).toBe("ready");
    });
    expect(ledger?.getAttribute("aria-busy")).toBe("false");
    expect(ledger?.dataset).toMatchObject({
      projectionVersion: "hakimi.bazi.strength_evidence_narrative/0.1.0",
      contentVersion: "0.18.0",
      bindingState: "ready",
      includeHour: "true",
      claimCount: "12",
      withheldPositionCount: "0",
      expertTruthClaimed: "false",
      scientificValidityClaimed: "false",
      formalActivationAllowed: "false",
      chartOrStorageMutationPerformed: "false",
      goodBadOrientation: "null",
      eventOutcome: "null",
      result: "null"
    });
    expect(Number(ledger?.dataset.factorCount)).toBeGreaterThan(0);
    expect(Number(ledger?.dataset.evidenceItemCount) - Number(ledger?.dataset.factorCount)).toBe(1);
    expect(within(ledger!).getByRole("heading", { name: "旺衰为什么落在这一档" })).toBeTruthy();
    expect(within(ledger!).queryByRole("button")).toBeNull();

    const claims = [...ledger!.querySelectorAll<HTMLElement>(".bazi-strength-claim-card")];
    expect(claims).toHaveLength(12);
    expect(claims.map((claim) => Number(claim.id.replace("bazi-strength-claim-", "")))).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1)
    );
    expect(claims.every((claim) => (
      claim.dataset.expertTruthClaimed === "false"
      && claim.dataset.scientificValidityClaimed === "false"
      && claim.dataset.formalActivationAllowed === "false"
      && claim.dataset.result === "null"
      && claim.querySelectorAll(".bazi-strength-claim-context > section").length === 2
    ))).toBe(true);

    const weightClaim = ledger!.querySelector<HTMLElement>(
      "[data-claim-id='bazi.engineering.strength.factor_weights_4_2_2_1.v1']"
    );
    expect(weightClaim).toBeTruthy();
    expect(within(weightClaim!).getByText("成立条件", { exact: true })).toBeTruthy();
    expect(within(weightClaim!).getByText("只在当前政策版本和完整事实快照上复演。", { exact: true })).toBeTruthy();
    expect(within(weightClaim!).getByText("反例／改写门", { exact: true })).toBeTruthy();
    expect(within(weightClaim!).getByText(/月主气双计、藏干顺序争议、特殊格局/)).toBeTruthy();
    const weightBinding = weightClaim!.querySelector<HTMLElement>("[data-binding-id='binding:policy:weights']");
    expect(weightBinding?.dataset).toMatchObject({
      locatorVerification: "verified",
      parameterSupport: "exact_engineering_definition"
    });
    expect(within(weightBinding!).getByText(/BAZI_STRENGTH_FACTOR_WEIGHTS/)).toBeTruthy();
    expect(within(weightBinding!).getByText(/古籍规定该权重/)).toBeTruthy();

    const monthCommand = ledger!.querySelector<HTMLElement>(
      "[data-category='month_command'][data-position='month'][data-month-main-duplicate-role='month_command']"
    );
    const monthFirstHidden = ledger!.querySelector<HTMLElement>(
      "[data-category='first_hidden_stem'][data-position='month'][data-month-main-duplicate-role='first_hidden_stem']"
    );
    expect(monthCommand?.dataset).toMatchObject({ status: "included", weight: "4" });
    expect(monthFirstHidden?.dataset).toMatchObject({ status: "included", weight: "2" });
    const duplicate = ledger!.querySelector<HTMLElement>(".bazi-strength-month-duplicate");
    expect(duplicate?.dataset.duplicateDetected).toBe("true");
    expect(within(duplicate!).getByText("月主气重复计权：6", { exact: true })).toBeTruthy();
  });

  it("exposes a read-only 69-item content review queue without fabricating any expert decision", async () => {
    const { container } = render(<BaziInterpretationPanel revision={await revisionFor(input)} />);
    const queue = container.querySelector<HTMLElement>(".bazi-content-review-queue");

    expect(queue).toBeTruthy();
    expect(queue?.dataset).toMatchObject({
      reviewQueueVersion: "hakimi.bazi.content_review_queue/0.1.0",
      workflowMode: "read_only_export_only",
      totalCount: "69",
      unresolvedCount: "69",
      approvedCount: "0",
      revisedCount: "0",
      rejectedCount: "0",
      expertTruthClaimed: "false",
      formalActivationAllowed: "false"
    });
    expect(within(queue!).getByRole("heading", { name: "内容质量审稿台" })).toBeTruthy();
    expect(within(queue!).getByText("69 项 · 全部未裁决", { exact: true })).toBeTruthy();
    expect(within(queue!).getByRole("button", { name: "导出 69 项审稿清单 JSON" })).toBeTruthy();
    expect(within(queue!).getByText(/hakimi-bazi-content-review-queue-v017\.json/)).toBeTruthy();
    const feedbackWorkbench = queue!.querySelector<HTMLElement>(".bazi-content-review-feedback-workbench");
    expect(feedbackWorkbench).toBeTruthy();
    expect(feedbackWorkbench?.dataset).toMatchObject({
      feedbackFormat: "hakimi.bazi.content_review_feedback/0.1.0",
      workflowMode: "human_attributed_read_only_preflight",
      preflightState: "not_loaded",
      resolvedCount: "0",
      unresolvedCount: "69",
      reviewerAttributionComplete: "false",
      identityVerified: "false",
      digitalSignatureVerified: "false",
      eligibleForFormalActivation: "false",
      autoIntegrationAllowed: "false",
      chartOrStorageMutationPerformed: "false",
      result: "null"
    });
    expect(within(feedbackWorkbench!).getByRole("heading", { name: "审稿反馈工作包" })).toBeTruthy();
    expect(within(feedbackWorkbench!).getByRole("button", { name: "导出 69 项反馈模板" })).toBeTruthy();
    expect(within(feedbackWorkbench!).getByRole("button", { name: "预检已填写反馈 JSON" })).toBeTruthy();
    expect(within(feedbackWorkbench!).getByText(/identityVerified:false.*auto integration:false.*mutation:false/)).toBeTruthy();

    const summaries = [...queue!.querySelectorAll<HTMLElement>(".bazi-content-review-summary > article")];
    expect(summaries.map((summary) => [
      summary.dataset.category,
      within(summary).getByText(/未裁决 · 0 已批准/).textContent
    ])).toEqual([
      ["strength_method", "4 未裁决 · 0 已批准"],
      ["ten_god_position", "40 未裁决 · 0 已批准"],
      ["shensha_rule", "5 未裁决 · 0 已批准"],
      ["shensha_position", "20 未裁决 · 0 已批准"]
    ]);
    const groups = [...queue!.querySelectorAll<HTMLDetailsElement>(".bazi-content-review-groups > details")];
    expect(groups.map((group) => group.querySelectorAll(":scope > ol > li").length)).toEqual([4, 40, 5, 20]);
    const reviewItems = [...queue!.querySelectorAll<HTMLElement>("[data-review-item-id]")];
    expect(reviewItems).toHaveLength(69);
    expect(reviewItems.every((item) => (
      item.dataset.decision === "unresolved"
      && item.dataset.reviewer === "null"
      && item.dataset.reviewedAt === "null"
      && item.dataset.result === "null"
      && item.dataset.expertTruthClaimed === "false"
      && item.dataset.formalActivationAllowed === "false"
    ))).toBe(true);

    fireEvent.click(within(groups[0]).getByText("旺衰方法", { exact: true }));
    expect(groups[0].open).toBe(true);
    expect(within(groups[0]).getByText("月令主气与首位藏干重复计权", { exact: true })).toBeTruthy();
    expect(within(groups[0]).getAllByText(/decision:unresolved · reviewer:null · reviewedAt:null · result:null/)).toHaveLength(4);
  });

  it("fails closed for hour interpretation when the revision has no reliable hour", async () => {
    const revision = await revisionFor(input);
    const withoutHour: RevisionRecord = {
      ...revision,
      input: { ...revision.input, time: null, timePrecision: "unknown_hour" }
    };
    const { container } = render(<BaziInterpretationPanel revision={withoutHour} />);

    const evidenceLedger = container.querySelector<HTMLElement>(".bazi-strength-evidence-ledger");
    expect(evidenceLedger).toBeTruthy();
    await waitFor(() => {
      expect(evidenceLedger?.dataset.bindingState).toBe("ready");
    });
    expect(evidenceLedger?.dataset).toMatchObject({
      projectionVersion: "hakimi.bazi.strength_evidence_narrative/0.1.0",
      contentVersion: "0.18.0",
      includeHour: "false",
      claimCount: "12",
      withheldPositionCount: "1",
      expertTruthClaimed: "false",
      scientificValidityClaimed: "false",
      formalActivationAllowed: "false",
      chartOrStorageMutationPerformed: "false",
      goodBadOrientation: "null",
      eventOutcome: "null",
      result: "null"
    });
    const withheldEvidence = [
      ...evidenceLedger!.querySelectorAll<HTMLElement>("[data-status='withheld_unreliable_hour']")
    ];
    expect(withheldEvidence.map((item) => item.dataset.category)).toEqual([
      "visible_stem",
      "first_hidden_stem",
      "other_hidden_stem"
    ]);
    expect(withheldEvidence.every((item) => (
      item.dataset.position === "hour"
      && item.dataset.factorId === "null"
      && item.dataset.group === "null"
      && item.dataset.strengthDirection === "null"
      && item.dataset.weight === "null"
      && within(item).getByText(/时辰不可靠 · withheld/) !== null
    ))).toBe(true);
    expect([
      ...evidenceLedger!.querySelectorAll<HTMLElement>("[data-status='included']")
    ].every((item) => item.dataset.position !== "hour")).toBe(true);
    expect(evidenceLedger!.textContent).not.toContain(revision.facts.pillars.hour.ganZhi);
    expect(evidenceLedger!.innerHTML).not.toContain(`visible:hour:${revision.facts.pillars.hour.stem}`);
    for (const [index, stem] of revision.facts.pillars.hour.hiddenStems.entries()) {
      expect(evidenceLedger!.innerHTML).not.toContain(`hidden:hour:${stem}:${index}`);
    }

    const firstReadSteps = [...container.querySelectorAll<HTMLElement>(".bazi-first-read-review > .bazi-first-read-steps > li")];
    expect(firstReadSteps[1].dataset).toMatchObject({ stepId: "pillar_ten_gods", availability: "partial" });
    expect(within(firstReadSteps[1]).getByText("3/4 柱可读")).toBeTruthy();
    expect(within(firstReadSteps[1]).getByText(/时辰不可靠，本柱关闭/)).toBeTruthy();
    expect(firstReadSteps[3].dataset).toMatchObject({ stepId: "shensha_gate", availability: "not_requested" });
    const themeIndex = screen.getByRole("navigation", { name: "按柱位钻取现有内容" });
    const themeCards = [...within(themeIndex).getByRole("list", { name: "八字主题索引" })
      .querySelectorAll<HTMLElement>(":scope > li")];
    expect(themeCards[3].dataset).toMatchObject({
      themeId: "hour",
      availability: "partial",
      occurrenceCount: "0",
      rank: "null",
      score: "null",
      result: "null"
    });
    expect(within(themeCards[3]).getByText(/不列出或补猜任何时柱十神出现项/)).toBeTruthy();
    const readings = screen.getByRole("list", { name: "四柱十神位置解读" });
    expect(within(readings).getByText("时辰未定")).toBeTruthy();
    expect(within(readings).getByText(/时柱内容不参与旺衰/)).toBeTruthy();
    expect(within(readings).getByText(/本柱透干与藏干十神出现项全部关闭/)).toBeTruthy();
    expect(container.querySelectorAll(".ten-god-occurrence-review")).toHaveLength(3);
    expect(container.querySelectorAll(".ten-god-occurrence-item")).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "打开只读研究预览" }));
    const shenshaPillars = [...container.querySelectorAll<HTMLElement>(".shensha-pillar-grid > article")];
    expect(shenshaPillars).toHaveLength(4);
    expect(shenshaPillars[3].dataset).toMatchObject({
      position: "hour",
      availability: "uncertain_hour",
      occurrenceCount: "0",
      result: "null",
      overallGoodBad: "null"
    });
    expect(within(shenshaPillars[3]).getByText(/本柱神煞出现项全部关闭/)).toBeTruthy();
    expect(container.querySelectorAll(".shensha-pillar-hit[data-content-id*='.hour.']")).toHaveLength(0);
  });

  it("keeps Shensha off until an explicit read-only preview action and does not mutate the rule snapshot", async () => {
    const revision = await revisionFor(input);
    const before = structuredClone(revision.ruleProfile);
    const { container } = render(<BaziInterpretationPanel revision={revision} />);

    expect(revision.ruleProfile.layers.shensha).toBe(false);
    expect(screen.queryByRole("heading", { name: "本盘神煞命中事实" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "打开只读研究预览" }));

    expect(screen.getByRole("heading", { name: "按四柱查看神煞命中" })).toBeTruthy();
    const shenshaPillars = [...container.querySelectorAll<HTMLElement>(".shensha-pillar-grid > article")];
    expect(shenshaPillars.map((pillar) => ({
      position: pillar.dataset.position,
      count: pillar.dataset.occurrenceCount,
      availability: pillar.dataset.availability,
      result: pillar.dataset.result,
      overall: pillar.dataset.overallGoodBad
    }))).toEqual([
      { position: "year", count: "0", availability: "available", result: "null", overall: "null" },
      { position: "month", count: "1", availability: "available", result: "null", overall: "null" },
      { position: "day", count: "1", availability: "available", result: "null", overall: "null" },
      { position: "hour", count: "0", availability: "available", result: "null", overall: "null" }
    ]);
    const shenshaOccurrences = [...container.querySelectorAll<HTMLElement>(".shensha-pillar-hit")];
    expect(shenshaOccurrences).toHaveLength(2);
    expect(shenshaOccurrences.every((item) => (
      item.dataset.reviewStatus === "candidate_pending_expert_review"
      && item.dataset.shenshaOrientation === "null"
      && item.dataset.overallGoodBad === "null"
      && item.dataset.result === "null"
    ))).toBe(true);
    expect(screen.getByText("以年干乙取子、申；月柱甲申的地支申命中。")).toBeTruthy();
    expect(screen.getByText("以年支亥取巳；日柱辛巳的地支巳命中。")).toBeTruthy();
    expect(screen.getByText(/按柱投影 hakimi\.bazi\.shensha_occurrence_review\/0\.1\.0 · 2 项/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "本盘神煞命中事实" })).toBeTruthy();
    expect(screen.getByText(/先显示“以什么为基准、取什么支、落在哪一柱”/)).toBeTruthy();
    expect(screen.getByText(/默认关闭 · 只读候选/)).toBeTruthy();
    expect(screen.getAllByText(/事实层仍为 interpretation:null/).length).toBeGreaterThan(0);
    expect(screen.getByText("以年干乙取子、申；本盘在月柱见申。")).toBeTruthy();
    expect(screen.queryByText("以年干乙取子、申；本盘在月柱见子、申。")).toBeNull();
    expect(within(screen.getByRole("list", { name: "本盘神煞候选命中" })).getAllByRole("listitem").length).toBeGreaterThan(0);
    const positionCandidates = [...container.querySelectorAll<HTMLElement>(".shensha-position-candidate")];
    expect(positionCandidates.length).toBeGreaterThan(0);
    expect(positionCandidates.every((candidate) => (
      candidate.dataset.reviewStatus === "candidate_pending_expert_review"
      && candidate.dataset.result === "null"
    ))).toBe(true);
    expect(screen.getByRole("heading", { name: "天乙贵人落月柱 · 位置议题候选" })).toBeTruthy();
    expect(screen.getAllByText(/导师、专业协助、程序资源和求助路径/).length).toBeGreaterThanOrEqual(2);
    expect(positionCandidates.every((candidate) => (
      within(candidate).getByText(/result:null · 不评分/) !== null
    ))).toBe(true);
    const synthesisReviews = [...container.querySelectorAll<HTMLElement>(".bazi-position-synthesis-review")];
    expect(synthesisReviews).toHaveLength(positionCandidates.length);
    expect(synthesisReviews.every((review) => (
      review.dataset.reviewStatus === "candidate_pending_expert_review"
      && ["favorable", "challenging", "conditional"].includes(review.dataset.tenGodOrientation ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(review.dataset.tenGodBalanceDirection ?? "")
      && ["may_restore_balance", "may_amplify_imbalance", "conditional"].includes(review.dataset.tenGodBaselineBalanceDirection ?? "")
      && ["stable_across_engineering_scenarios", "direction_sensitive", "insufficient"].includes(review.dataset.tenGodDirectionStability ?? "")
      && (review.dataset.tenGodDirectionStability !== "direction_sensitive" || review.dataset.tenGodBalanceDirection === "conditional")
      && review.dataset.shenshaOrientation === "null"
      && review.dataset.overallResult === "null"
    ))).toBe(true);
    expect(screen.getByText(/命中位置生成 \d+ 个同柱复核包/)).toBeTruthy();
    const tianyiSynthesis = screen.getByLabelText("月柱天乙贵人同柱合参复核包");
    expect(within(tianyiSynthesis).getByText(/只来自十神.*天乙贵人不参与这个标签.*综合喜忌.*null/)).toBeTruthy();
    expect(within(tianyiSynthesis).getByText(/现实记录中，月柱的/)).toBeTruthy();
    expect(within(tianyiSynthesis).getByText(/overall:null · shensha:null · 不评分/)).toBeTruthy();
    expect(revision.ruleProfile).toEqual(before);
  });
});
