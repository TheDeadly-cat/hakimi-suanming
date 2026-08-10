import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCalendarConversionReviewBundle,
  serializeCalendarConversionReviewBundle
} from "@hakimi/gold-standard/lunar-conversion";
import {
  createTransitQueryReviewBundle,
  serializeTransitQueryReviewBundle
} from "@hakimi/research-query/transit-review";
import { createWorkingDefaultRulePackEnvelope, serializeRulePackEnvelope } from "@hakimi/rule-packs";
import { caseRepository, ruleRegistryRepository } from "@hakimi/storage";
import { SettingsPage } from "./settings-page";
import { EXPERT_MODE_KEY } from "../lib/expert-mode";

const { saveTextFileMock, pickTextFileMock } = vi.hoisted(() => ({
  saveTextFileMock: vi.fn(),
  pickTextFileMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  saveTextFile: saveTextFileMock,
  pickTextFile: pickTextFileMock
}));

beforeEach(async () => {
  window.localStorage.clear();
  saveTextFileMock.mockReset().mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  pickTextFileMock.mockReset();
  await caseRepository.clearAll();
});

describe("SettingsPage", () => {
  it("专家模式开关写入本地偏好并可重新读取", async () => {
    render(<SettingsPage />);

    const toggle = screen.getByLabelText(/专家模式：显示原始标识与完整摘要/);
    expect(toggle).toHaveProperty("checked", false);

    fireEvent.click(toggle);
    expect(window.localStorage.getItem(EXPERT_MODE_KEY)).toBe("1");
    expect(toggle).toHaveProperty("checked", true);

    fireEvent.click(toggle);
    expect(window.localStorage.getItem(EXPERT_MODE_KEY)).toBeNull();
    expect(toggle).toHaveProperty("checked", false);
  });

  it("导出可复现且不含出生资料的 1.2 诊断", async () => {
    render(<SettingsPage />);
    expect(screen.getByText("Dexie 13")).toBeTruthy();
    expect(screen.getByText("IANA 2026c · 随应用锁定")).toBeTruthy();
    expect(screen.getByText("IANA 2025b · 随当前应用构建保留")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "加载并检查历史时区数据" }));
    expect(await screen.findByText(/历史时区数据 1\/1 已载入且行为哨兵通过/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "导出诊断 JSON" }));

    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    const diagnostic = JSON.parse(raw) as {
      format: string;
      formatVersion: string;
      appVersion: string;
      defaultRule: { profileDigest: string };
      storage: {
        databaseSchemaVersion: number;
        fullBackupFormatVersion: string;
        userDataPartitionCount: number;
      };
      ruleRegistry: { status: string; installedCount: number; active: unknown };
      timeZoneDatabase: {
        snapshotId: string;
        ianaVersion: string;
        artifactSha256: string;
        versionIdentified: boolean;
        hostIntlUsedForCalculation: boolean;
        artifactRegistryPolicy: string;
        retainedArtifacts: Array<{ ianaVersion: string; active: boolean }>;
      };
    };

    expect(fileName).toMatch(/^hakimi-diagnostic-/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(diagnostic).toMatchObject({
      format: "hakimi-bazi-diagnostic",
      formatVersion: "1.2.0",
      appVersion: "0.2.0-p0",
      storage: {
        databaseSchemaVersion: 13,
        fullBackupFormatVersion: "1.2.0",
        userDataPartitionCount: 16
      },
      ruleRegistry: {
        status: "readable",
        installedCount: 0,
        active: null
      },
      timeZoneDatabase: {
        ianaVersion: "2026c",
        artifactSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
        versionIdentified: true,
        hostIntlUsedForCalculation: false,
        artifactRegistryPolicy: "append_only_offline_bundled",
        retainedArtifacts: [
          { ianaVersion: "2026c", active: true },
          { ianaVersion: "2025b", active: false }
        ]
      }
    });
    expect(diagnostic.timeZoneDatabase.snapshotId).toContain("iana-tzdb@2026c/sha256:");
    expect(diagnostic.defaultRule.profileDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(raw).not.toContain("birthInput");
    expect(raw).not.toContain("note");
    expect(await screen.findByText(/但包含浏览器标识及规则包 ID\/摘要/)).toBeTruthy();
  });

  it("把完整数据操作迁到独立页面，同时显示失败关闭的 360 配额总账", async () => {
    render(<SettingsPage />);
    expect(screen.getByRole("link", { name: "打开帮助与安全边界" }).getAttribute("href")).toBe("/help");
    expect(screen.getByRole("heading", { name: "数据管理与完整备份" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "打开数据管理" }).getAttribute("href")).toBe("/settings/data");
    expect(screen.getByRole("heading", { name: "金标准候选审核" })).toBeTruthy();
    expect(screen.getByText(/现有 36 行节气边界数据均为回归候选，已验证 0 行/)).toBeTruthy();
    expect(await screen.findByText("360 例项目发布门仍关闭")).toBeTruthy();
    expect(screen.getByText(/合计 60 个 candidate、0 个 verified/)).toBeTruthy();
    expect(screen.getByText("300")).toBeTruthy();
    expect(await screen.findByText("20,000 例工程诊断已冻结，仍有历表差异待裁决")).toBeTruthy();
    expect(screen.getByText(/19832 \/ 20000/)).toBeTruthy();
    expect(screen.getByText(/7 条差异保持“未解决历表差异”/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /打开 2089 \/ 2097 连续窗口审计/ }).getAttribute("href"))
      .toBe("/settings/calendar-divergence-audit");
    expect(screen.getByRole("button", { name: /导出 36 行审核包/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检双人裁决记录/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "农历转换候选审核" })).toBeTruthy();
    expect(screen.getByText(/24 对香港天文台权威历表候选/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /导出 24 对农历审核包/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /载入审核包预检/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检农历双人裁决/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("heading", { name: "运限查询专家审核" })).toBeTruthy();
    expect(screen.getByText(/人工验证金标为 0/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "打开本地未核验审核收件箱" }).getAttribute("href"))
      .toBe("/settings/transit-review-inbox");
    expect(screen.getByRole("button", { name: /导出运限查询审核包/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /载入运限审核包/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /预检独立审核 B/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /预检运限最终裁决/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("heading", { name: "规则包仓库与激活" })).toBeTruthy();
    expect(screen.getByText(/导入先进入本机隔离库，绝不自动激活/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /导出内置规则包/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /导出完整 ZIP/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /永久删除全部数据/ })).toBeNull();
  });

  it("把完整规则包保存到隔离库，并在明确确认后按精确摘要激活", async () => {
    const envelope = await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" });
    pickTextFileMock.mockResolvedValueOnce({
      name: "working-default.json",
      text: await serializeRulePackEnvelope(envelope)
    });
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "选择规则包" }));
    expect(await screen.findByText("声明式完整性预检通过，可保存到隔离库")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "保存到本机隔离库" }));
    expect(await screen.findByText(/已保存到本机隔离库；尚未激活/)).toBeTruthy();

    const activation = screen.getByRole("button", { name: "按精确摘要激活" });
    expect(activation).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByLabelText(/我确认只在本机使用此精确摘要/));
    expect(activation).toHaveProperty("disabled", false);
    fireEvent.click(activation);

    expect(await screen.findByText(/已由你在本机明确批准并激活/)).toBeTruthy();
    const active = await ruleRegistryRepository.getActiveRulePack();
    expect(active?.activeDigest).toBe(envelope.digest.value);
    expect(active?.activeProfileDigest).toMatch(/^[a-f0-9]{64}$/);

    fireEvent.click(screen.getByRole("button", { name: "导出诊断 JSON" }));
    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const diagnostic = JSON.parse(saveTextFileMock.mock.calls[0]?.[1] as string) as {
      ruleRegistry: {
        status: string;
        installedCount: number;
        active: {
          packId: string;
          packDigest: string;
          profileId: string;
          profileVersion: string;
          profileDigest: string;
          localTrust: string;
          approvalStatus: string;
        };
      };
    };
    expect(diagnostic.ruleRegistry).toMatchObject({
      status: "readable",
      installedCount: 1,
      active: {
        packId: envelope.metadata.packId,
        packDigest: envelope.digest.value,
        profileId: envelope.profile.profileId,
        profileVersion: envelope.profile.profileVersion,
        profileDigest: active?.activeProfileDigest,
        localTrust: "unverified_local_import",
        approvalStatus: "locally_approved_for_activation"
      }
    });
  });

  it("导出绑定候选与规则摘要的 36 行审核包，但不提高金标计数", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /导出 36 行审核包/ }));

    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    const envelope = JSON.parse(raw) as {
      format: string;
      digest: string;
      payload: { candidates: unknown[]; dataset: { requiredReleaseGoldCaseCount: number } };
    };
    expect(fileName).toMatch(/^hakimi-gold-review-jie-2024-/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(envelope.format).toBe("hakimi-gold-review-bundle");
    expect(envelope.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.candidates).toHaveLength(36);
    expect(envelope.payload.dataset.requiredReleaseGoldCaseCount).toBe(360);
    expect(await screen.findByText(/不会改变当前 0 金标状态/)).toBeTruthy();
  });

  it("按需载入农历模块，导出并预检绑定当前 fixture 的 24 对审核包", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /导出 24 对农历审核包/ }));

    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    const envelope = JSON.parse(raw) as {
      format: string;
      digest: string;
      payload: {
        candidates: Array<{ id: string; candidateDigest: string }>;
        dataset: { fixtureDigest: string; datasetDigest: string };
        reviewPolicy: { currentVerifiedCount: number };
      };
    };
    expect(fileName).toMatch(/^hakimi-gold-review-calendar-conversion-/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(envelope.format).toBe("hakimi-calendar-conversion-review-bundle");
    expect(envelope.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.dataset.fixtureDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.dataset.datasetDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.candidates).toHaveLength(24);
    expect(new Set(envelope.payload.candidates.map((candidate) => candidate.id)).size).toBe(24);
    expect(envelope.payload.candidates.every((candidate) => /^[a-f0-9]{64}$/.test(candidate.candidateDigest))).toBe(true);
    expect(envelope.payload.reviewPolicy.currentVerifiedCount).toBe(0);
    expect(await screen.findByText(/当前仍为 0 条人工验证金标/)).toBeTruthy();
    expect(screen.getByText("审核包已绑定到当前页面")).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检农历双人裁决/ })).toHaveProperty("disabled", false);
  });

  it("只有预检通过的农历审核包才会解锁裁决入口，错误文件保持只读", async () => {
    const bundle = await createCalendarConversionReviewBundle({
      generatedAt: "2026-08-01T00:01:00.000Z"
    });
    const raw = serializeCalendarConversionReviewBundle(bundle);
    pickTextFileMock.mockResolvedValueOnce({
      name: "calendar-review-bundle.json",
      size: raw.length,
      type: "application/json",
      text: raw
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /载入审核包预检/ }));
    expect(await screen.findByText("审核包已绑定到当前页面")).toBeTruthy();
    const decisionButton = screen.getByRole("button", { name: /预检农历双人裁决/ });
    expect(decisionButton).toHaveProperty("disabled", false);

    pickTextFileMock.mockResolvedValueOnce({
      name: "invalid-decision.json",
      size: 2,
      type: "application/json",
      text: "{}"
    });
    fireEvent.click(decisionButton);
    expect((await screen.findByRole("alert")).textContent).toContain("农历审核未完成");
    expect(screen.queryByText(/农历裁决预检通过/)).toBeNull();
  });

  it("按需生成并绑定六轨运限查询审核包，但保持人工金标为 0", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /导出运限查询审核包/ }));

    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1), { timeout: 20_000 });
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    const envelope = JSON.parse(raw) as {
      format: string;
      digest: string;
      payload: { candidates: Array<{ id: string; candidateDigest: string }> };
    };
    expect(fileName).toMatch(/^hakimi-transit-query-review-/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(envelope.format).toBe("hakimi-transit-query-review-bundle");
    expect(envelope.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.candidates).toHaveLength(18);
    expect(new Set(envelope.payload.candidates.map((candidate) => candidate.id)).size).toBe(18);
    expect(envelope.payload.candidates.every((candidate) => /^[a-f0-9]{64}$/.test(candidate.candidateDigest))).toBe(true);
    expect(await screen.findByText(/人工验证金标仍为 0/)).toBeTruthy();
    expect(screen.getByText("运限审核包已绑定到当前页面")).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检独立审核 B/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检运限最终裁决/ })).toHaveProperty("disabled", true);
  }, 30_000);

  it("只绑定预检通过的运限审核包，并在错误文件后清除旧绑定", async () => {
    const bundle = await createTransitQueryReviewBundle({
      generatedAt: "2026-08-01T17:00:00.000Z"
    });
    const raw = serializeTransitQueryReviewBundle(bundle);
    pickTextFileMock.mockResolvedValueOnce({
      name: "transit-query-review.json",
      size: raw.length,
      type: "application/json",
      text: raw
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /载入运限审核包/ }));
    expect(await screen.findByText("运限审核包已绑定到当前页面", {}, { timeout: 20_000 })).toBeTruthy();

    pickTextFileMock.mockResolvedValueOnce({
      name: "invalid-transit-review.json",
      size: 2,
      type: "application/json",
      text: "{}"
    });
    fireEvent.click(screen.getByRole("button", { name: /载入运限审核包/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("运限查询审核未完成");
    expect(screen.queryByText("运限审核包已绑定到当前页面")).toBeNull();
    expect(screen.getByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /预检运限最终裁决/ })).toHaveProperty("disabled", true);
  }, 30_000);

  it("独立审核文件必须绑定当前候选包，错误文件不会解锁最终裁决", async () => {
    const bundle = await createTransitQueryReviewBundle({
      generatedAt: "2026-08-01T17:00:00.000Z"
    });
    pickTextFileMock
      .mockResolvedValueOnce({
        name: "transit-query-review.json",
        size: serializeTransitQueryReviewBundle(bundle).length,
        type: "application/json",
        text: serializeTransitQueryReviewBundle(bundle)
      })
      .mockResolvedValueOnce({
        name: "invalid-independent-review.json",
        size: 2,
        type: "application/json",
        text: "{}"
      });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /载入运限审核包/ }));
    expect(await screen.findByText("运限审核包已绑定到当前页面", {}, { timeout: 20_000 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /预检独立审核 A/ }));
    expect((await screen.findByRole("alert", {}, { timeout: 20_000 })).textContent).toContain("运限查询审核未完成");
    expect(screen.getByRole("button", { name: /预检运限最终裁决/ })).toHaveProperty("disabled", true);
    expect(screen.queryByText("独立审核结构预检进度")).toBeNull();
  }, 30_000);

});
