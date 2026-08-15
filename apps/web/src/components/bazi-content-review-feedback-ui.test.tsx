import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BirthInput, RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import {
  installFileTransferPort,
  type FilePayload,
  type FileSaveResult,
  type FileTransferPort,
  type PickFileOptions
} from "@hakimi/platform";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { BaziInterpretationPanel } from "./bazi-interpretation-panel";

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

async function revisionForTest(
  birth: BirthInput = input,
  id = "11111111-1111-4111-8111-111111111111"
): Promise<RevisionRecord> {
  const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
  return {
    schemaVersion: "1.0.0",
    id,
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

let restoreFileTransferPort: (() => void) | null = null;
let nextPickedFile: { name: string; blob: Blob } | null = null;
let savedPayloads: FilePayload[] = [];
let lastPickOptions: PickFileOptions | undefined;
let nextSaveResult: FileSaveResult;

beforeEach(() => {
  nextPickedFile = null;
  savedPayloads = [];
  lastPickOptions = undefined;
  nextSaveResult = { status: "download_requested", filename: "", method: "browser_download" };
  const port: FileTransferPort = {
    getCapabilities: () => ({
      canDownloadFiles: true,
      canChooseSaveLocation: false,
      canShareFiles: false
    }),
    async pickFile(options) {
      lastPickOptions = options;
      if (!nextPickedFile) return { status: "cancelled" };
      return {
        status: "selected",
        file: {
          name: nextPickedFile.name,
          size: nextPickedFile.blob.size,
          type: "application/json",
          blob: nextPickedFile.blob
        }
      };
    },
    async saveFile(payload) {
      savedPayloads.push(payload);
      return { ...nextSaveResult, filename: payload.filename };
    },
    async shareFile(payload) {
      return { status: "unsupported", filename: payload.filename, operation: "share", reason: "test" };
    }
  };
  restoreFileTransferPort = installFileTransferPort(port);
});

afterEach(() => {
  restoreFileTransferPort?.();
  restoreFileTransferPort = null;
});

describe("Bazi content review feedback workbench", () => {
  it("exports a bound template, preflights attributed feedback, and clears a stale result after invalid input", async () => {
    const { container } = render(<BaziInterpretationPanel revision={await revisionForTest()} />);
    const workbench = container.querySelector<HTMLElement>(".bazi-content-review-feedback-workbench")!;

    fireEvent.click(within(workbench).getByRole("button", { name: "导出 69 项反馈模板" }));
    await waitFor(() => expect(savedPayloads).toHaveLength(1));
    expect(savedPayloads[0]?.filename).toBe("hakimi-bazi-content-review-feedback-v017.json");
    const template = JSON.parse(await savedPayloads[0]!.blob.text()) as {
      reviewer: Record<string, string | boolean>;
      reviewSession: Record<string, string>;
      items: Array<Record<string, unknown>>;
      declaredCounts: Record<string, number>;
      boundary: Record<string, unknown>;
    };
    expect(template.items).toHaveLength(69);
    expect(template.boundary).toMatchObject({
      identityVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    });

    Object.assign(template.reviewer, {
      reviewerId: "reviewer-ui-001",
      displayName: "界面审稿人",
      affiliation: "独立研究",
      expertiseStatement: "仅提交具名候选审稿意见，身份仍待线下核验。"
    });
    Object.assign(template.reviewSession, {
      reviewedAt: "2026-08-12T13:00:00+08:00",
      methodology: "逐项核对候选与来源。"
    });
    Object.assign(template.items[0]!, {
      decision: "approve",
      decisionReason: "同意保留为候选，不代表正式命理真值。"
    });
    Object.assign(template.declaredCounts, { total: 69, unresolved: 68, approve: 1, revise: 0, reject: 0 });
    nextPickedFile = {
      name: "filled-feedback.json",
      blob: new Blob([JSON.stringify(template)], { type: "application/json" })
    };

    fireEvent.click(within(workbench).getByRole("button", { name: "预检已填写反馈 JSON" }));
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("valid"));
    expect(lastPickOptions).toEqual({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
    expect(workbench.dataset).toMatchObject({
      resolvedCount: "1",
      unresolvedCount: "68",
      reviewerAttributionComplete: "true",
      identityVerified: "false",
      digitalSignatureVerified: "false",
      eligibleForFormalActivation: "false",
      autoIntegrationAllowed: "false",
      chartOrStorageMutationPerformed: "false",
      result: "null"
    });
    expect(within(workbench).getByText(/只读预检通过：filled-feedback\.json · 已裁决 1\/69/)).toBeTruthy();
    expect(within(workbench).getByText("1 已裁决 · 68 未决", { exact: true })).toBeTruthy();
    expect(within(workbench).getByText("界面审稿人 · reviewer-ui-001", { exact: true })).toBeTruthy();

    nextPickedFile = {
      name: "tampered-feedback.json",
      blob: new Blob(["{\"invalid\":true}"], { type: "application/json" })
    };
    fireEvent.click(within(workbench).getByRole("button", { name: "预检已填写反馈 JSON" }));
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("invalid"));
    expect(workbench.dataset).toMatchObject({
      resolvedCount: "0",
      unresolvedCount: "69",
      reviewerAttributionComplete: "false"
    });
    expect(within(workbench).getByRole("alert").textContent).toMatch(/字段集合不匹配/);
    expect(screen.queryByText("1 已裁决 · 68 未决", { exact: true })).toBeNull();
    expect(savedPayloads).toHaveLength(1);
  });

  it("prepares, exports and preflights a current-chart-only packet, then invalidates it across revisions", async () => {
    const firstRevision = await revisionForTest();
    const rendered = render(<BaziInterpretationPanel revision={firstRevision} />);
    let workbench = rendered.container.querySelector<HTMLElement>(".bazi-current-chart-review-workbench")!;
    expect(workbench.dataset).toMatchObject({
      packetVersion: "hakimi.bazi.current_chart_hit_review/0.2.0",
      contentVersion: "0.18.0",
      strengthPolicyVersion: "hakimi.bazi.strength_policy/0.1.0",
      preflightState: "unprepared",
      operationState: "idle",
      totalCount: "0",
      expertTruthClaimed: "false",
      scientificValidityClaimed: "false",
      formalActivationAllowed: "false",
      autoIntegrationAllowed: "false",
      catalogDecisionInheritanceApplied: "false",
      networkTransmissionPerformed: "false",
      chartOrStorageMutationPerformed: "false",
      result: "null"
    });
    expect(within(workbench).getByRole("button", { name: "导出本盘反馈模板" }).hasAttribute("disabled")).toBe(true);
    expect(within(workbench).getByRole("button", { name: "预检本盘反馈 JSON" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(within(workbench).getByRole("button", { name: "准备当前盘复核包" }));
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("ready"));
    expect(workbench.dataset.factsSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.strengthPolicySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.strengthAssessmentSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.strengthSensitivitySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.strengthEvidenceNarrativeSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.strengthClaimRegistrySha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.packetSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(workbench.dataset.orderedItemIdsSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(Number(workbench.dataset.totalCount)).toBe(
      4 + Number(workbench.dataset.tenGodOccurrenceCount) + Number(workbench.dataset.shenshaOccurrenceCount)
    );

    fireEvent.click(within(workbench).getByRole("button", { name: "导出本盘反馈模板" }));
    await waitFor(() => expect(savedPayloads).toHaveLength(1));
    expect(savedPayloads[0]?.filename).toBe("hakimi-bazi-current-chart-hit-review-v018.json");
    const template = JSON.parse(await savedPayloads[0]!.blob.text()) as {
      packet: { counts: { total: number }; factsProjection: unknown };
      reviewer: Record<string, string | boolean>;
      reviewSession: Record<string, string>;
      decisions: Array<Record<string, unknown>>;
      declaredCounts: Record<string, number>;
      boundary: Record<string, unknown>;
    };
    expect(template.decisions).toHaveLength(template.packet.counts.total);
    expect(JSON.stringify(template)).not.toMatch(/"(?:caseId|revisionId|input|manifest|location|latitude|longitude|calculatedAt)"/u);
    expect(template.boundary).toMatchObject({
      identityVerified: false,
      digitalSignatureVerified: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      catalogDecisionInheritanceApplied: false,
      networkTransmissionPerformed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    });

    Object.assign(template.reviewer, {
      reviewerId: "reviewer-current-ui-001",
      displayName: "本盘界面审稿人",
      affiliation: "独立研究",
      expertiseStatement: "只提交当前候选实例意见，现实身份与资质仍待线下核验。"
    });
    Object.assign(template.reviewSession, {
      reviewedAt: "2026-08-13T16:00:00+08:00",
      methodology: "逐项核对本盘命中、传统范围、成立条件与反例。"
    });
    Object.assign(template.decisions[0]!, {
      decision: "approve",
      orientationProposal: "mixed_conditional",
      selectedTradition: "子平旺衰研究候选",
      decisionReason: "只同意保留当前盘条件化候选。",
      applicabilityConditions: "需同时核对月令、透藏和组合门。",
      counterexamples: "从格、专旺、化气或合化成立时重审。"
    });
    Object.assign(template.declaredCounts, {
      total: template.packet.counts.total,
      unresolved: template.packet.counts.total - 1,
      approve: 1,
      revise: 0,
      reject: 0
    });
    nextPickedFile = {
      name: "filled-current-chart-review.json",
      blob: new Blob([JSON.stringify(template)], { type: "application/json" })
    };
    fireEvent.click(within(workbench).getByRole("button", { name: "预检本盘反馈 JSON" }));
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("valid"));
    expect(workbench.dataset).toMatchObject({
      currentChartBound: "true",
      reviewerAttributionComplete: "true",
      expertTruthClaimed: "false",
      scientificValidityClaimed: "false",
      formalActivationAllowed: "false",
      autoIntegrationAllowed: "false",
      catalogDecisionInheritanceApplied: "false",
      networkTransmissionPerformed: "false",
      chartOrStorageMutationPerformed: "false",
      goodBadOrientation: "null",
      eventOutcome: "null",
      result: "null"
    });
    expect(within(workbench).getByText(`1 已裁决 · ${template.packet.counts.total - 1} 未决`, { exact: true })).toBeTruthy();

    const secondInput = { ...input, time: "09:26" } satisfies BirthInput;
    const secondRevision = await revisionForTest(secondInput, "33333333-3333-4333-8333-333333333333");
    rendered.rerender(<BaziInterpretationPanel revision={secondRevision} />);
    workbench = rendered.container.querySelector<HTMLElement>(".bazi-current-chart-review-workbench")!;
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("unprepared"));
    expect(workbench.dataset).toMatchObject({
      factsSha256: "null",
      packetSha256: "null",
      totalCount: "0",
      currentChartBound: "false",
      reviewerAttributionComplete: "false"
    });
    expect(within(workbench).getByRole("button", { name: "导出本盘反馈模板" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText(`1 已裁决 · ${template.packet.counts.total - 1} 未决`, { exact: true })).toBeNull();
  });

  it("keeps a prepared packet ready when file delivery fails instead of mislabeling preflight", async () => {
    const { container } = render(<BaziInterpretationPanel revision={await revisionForTest()} />);
    const workbench = container.querySelector<HTMLElement>(".bazi-current-chart-review-workbench")!;

    fireEvent.click(within(workbench).getByRole("button", { name: "准备当前盘复核包" }));
    await waitFor(() => expect(workbench.dataset.preflightState).toBe("ready"));

    nextSaveResult = {
      status: "failed",
      filename: "",
      operation: "save",
      stage: "download",
      reason: "测试下载交付失败"
    };
    fireEvent.click(within(workbench).getByRole("button", { name: "导出本盘反馈模板" }));

    await waitFor(() => expect(within(workbench).getByText("测试下载交付失败", { exact: true })).toBeTruthy());
    expect(workbench.dataset.preflightState).toBe("ready");
    expect(workbench.dataset.currentChartBound).toBe("false");
    expect(savedPayloads).toHaveLength(1);
  });
});
