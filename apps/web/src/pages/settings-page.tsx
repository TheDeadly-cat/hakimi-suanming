import { Download, HardDrive, ShieldCheck, Upload } from "lucide-react";
import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { digestRuleProfile, ENGINE, inspectRuleProfileCompatibility } from "@hakimi/bazi-core";
import {
  createJieBoundaryReviewBundle,
  preflightJieBoundaryDecision,
  serializeGoldReviewBundle,
  summarizeJieBoundaryEvidence,
  type GoldDecisionPreflight
} from "@hakimi/gold-standard";
import type {
  CalendarDecisionPreflight,
  CalendarReviewBundleEnvelope
} from "@hakimi/gold-standard/lunar-conversion";
import type { ProjectGoldReleaseGateReport } from "@hakimi/gold-standard/release-gate";
import type {
  TransitQueryAdjudicationPreflight,
  TransitQueryIndependentReviewEnvelope,
  TransitQueryReviewBundleEnvelope
} from "@hakimi/research-query/transit-review";
import {
  activeRulePackRecordSchema,
  FULL_BACKUP_FORMAT_VERSION,
  installedRulePackRecordSchema,
  type ActiveRulePackRecord,
  type InstalledRulePackRecord
} from "@hakimi/contracts";
import { pickTextFile, saveTextFile } from "@hakimi/platform";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  createWorkingDefaultRulePackEnvelope,
  preflightRulePack,
  serializeRulePackEnvelope,
  verifyRulePackIntegrity,
  type RulePackIntegrityResult
} from "@hakimi/rule-packs";
import {
  caseRepository,
  ruleRegistryRepository
} from "@hakimi/storage";
import {
  BUNDLED_TZDB_ARTIFACT_REGISTRY,
  verifyBundledTzdbArtifactRegistry
} from "@hakimi/tzdb-core";
import { RUNTIME_TIME_ZONE_DATABASE, RUNTIME_TZDB_VERSION } from "@hakimi/time-core";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { APP_VERSION } from "../lib/app-version";
import { CURRENT_RELEASE_DATABASE } from "../lib/current-release";
import { AppLink } from "../lib/router";
import { inspectInstalledRulePackRecord, type InstalledRulePackAudit } from "../lib/active-rule-pack";

type P003FrozenDiagnosticSummary = {
  reportDigest: string;
  internalDeterminism: {
    executed: number;
    deterministic: number;
    mismatch: number;
    calculationError: number;
  };
  calendarIndependentDifferential: {
    total: number;
    matched: number;
    mismatch: number;
    unsupported: number;
    differenceYears: string[];
    differenceClass: string | null;
  };
  releaseBoundary: {
    countsAsVerifiedGold: false;
    verifiedGoldDelta: 0;
    fullP003GatePassed: false;
    notice: string;
  };
};

async function buildRuleRegistryDiagnostic() {
  try {
    const [installed, active] = await Promise.all([
      ruleRegistryRepository.listInstalledRulePacks(),
      ruleRegistryRepository.getActiveRulePack()
    ]);
    const target = active
      ? installed.find((record) => record.packDigest === active.activeDigest) ?? null
      : null;
    return {
      status: "readable" as const,
      installedCount: installed.length,
      active: active && target ? {
        packId: target.packId,
        packDigest: active.activeDigest,
        profileId: target.profileId,
        profileVersion: target.profileVersion,
        profileDigest: active.activeProfileDigest,
        localTrust: target.localTrust,
        approvalStatus: active.approval.status
      } : null
    };
  } catch (reason) {
    return {
      status: "unreadable" as const,
      installedCount: null,
      active: null,
      error: reason instanceof Error ? reason.message : "规则包仓库无法读取"
    };
  }
}

export function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [fileTransferError, setFileTransferError] = useState<string | null>(null);
  const [rulePackPreview, setRulePackPreview] = useState<RulePackIntegrityResult | null>(null);
  const [rulePackPreviewIssues, setRulePackPreviewIssues] = useState<string[]>([]);
  const [installedRulePacks, setInstalledRulePacks] = useState<InstalledRulePackRecord[]>([]);
  const [installedRulePackAudits, setInstalledRulePackAudits] = useState<Record<string, InstalledRulePackAudit>>({});
  const [activeRulePack, setActiveRulePack] = useState<ActiveRulePackRecord | null>(null);
  const [rulePackAcknowledgements, setRulePackAcknowledgements] = useState<Record<string, boolean>>({});
  const [rulePackBusy, setRulePackBusy] = useState(false);
  const [rulePackError, setRulePackError] = useState<string | null>(null);
  const [goldDecisionPreview, setGoldDecisionPreview] = useState<GoldDecisionPreflight | null>(null);
  const [goldAuditError, setGoldAuditError] = useState<string | null>(null);
  const [projectGoldReport, setProjectGoldReport] = useState<ProjectGoldReleaseGateReport | null>(null);
  const [p003DiagnosticSummary, setP003DiagnosticSummary] = useState<P003FrozenDiagnosticSummary | null>(null);
  const [calendarReviewBundle, setCalendarReviewBundle] = useState<CalendarReviewBundleEnvelope | null>(null);
  const [calendarDecisionPreview, setCalendarDecisionPreview] = useState<CalendarDecisionPreflight | null>(null);
  const [calendarAuditError, setCalendarAuditError] = useState<string | null>(null);
  const [calendarAuditBusy, setCalendarAuditBusy] = useState(false);
  const [transitQueryReviewBundle, setTransitQueryReviewBundle] = useState<TransitQueryReviewBundleEnvelope | null>(null);
  const [transitQueryIndependentReviewA, setTransitQueryIndependentReviewA] = useState<TransitQueryIndependentReviewEnvelope | null>(null);
  const [transitQueryIndependentReviewB, setTransitQueryIndependentReviewB] = useState<TransitQueryIndependentReviewEnvelope | null>(null);
  const [transitQueryAdjudicationPreview, setTransitQueryAdjudicationPreview] = useState<TransitQueryAdjudicationPreflight | null>(null);
  const [transitQueryAuditError, setTransitQueryAuditError] = useState<string | null>(null);
  const [transitQueryAuditBusy, setTransitQueryAuditBusy] = useState(false);
  const [tzdbRegistryVerification, setTzdbRegistryVerification] = useState<
    { status: "idle" | "verifying" | "passed" | "failed"; message: string }
  >({ status: "idle", message: "尚未在本次页面会话中载入历史工件。" });

  const refreshRuleRegistry = async () => {
    const [installed, active] = await Promise.all([
      ruleRegistryRepository.listInstalledRulePacks(),
      ruleRegistryRepository.getActiveRulePack()
    ]);
    const audits = await Promise.all(installed.map((record) => inspectInstalledRulePackRecord(record, APP_VERSION)));
    setInstalledRulePacks(installed);
    setActiveRulePack(active);
    setInstalledRulePackAudits(Object.fromEntries(audits.map((audit) => [audit.record.packDigest, audit])));
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      import("@hakimi/gold-standard/release-gate"),
      import("@hakimi/gold-standard/p0-03-summary")
    ])
      .then(([{ summarizeProjectGoldReleaseGate }, summaryModule]) => {
        if (active) {
          setProjectGoldReport(summarizeProjectGoldReleaseGate());
          setP003DiagnosticSummary(summaryModule.default as P003FrozenDiagnosticSummary);
        }
      })
      .catch(() => {
        if (active) setGoldAuditError("项目级 360 配额登记表载入失败；发布门保持关闭。");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void refreshRuleRegistry().catch((reason: unknown) => {
      if (active) setRulePackError(reason instanceof Error ? reason.message : "规则包仓库读取失败。");
    });
    return () => { active = false; };
  }, []);

  const deliverTextFile = async (
    filename: string,
    content: string,
    subject: string
  ): Promise<string | null> => {
    setFileTransferError(null);
    const delivery = resolveFileDelivery(
      await saveTextFile(filename, content, "application/json;charset=utf-8"),
      subject
    );
    if (delivery.kind === "error") throw new Error(delivery.message);
    if (delivery.kind === "cancelled") {
      setMessage(delivery.message);
      return null;
    }
    return delivery.message;
  };

  const exportDiagnostic = async () => {
    setFileTransferError(null);
    try {
      const [storageOverview, defaultRuleDigest, ruleRegistry] = await Promise.all([
        caseRepository.getResearchSubjectOverview(),
        digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
        buildRuleRegistryDiagnostic()
      ]);
      const payload = {
      format: "hakimi-bazi-diagnostic",
      formatVersion: "1.2.0",
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      engine: ENGINE,
      defaultRule: {
        id: WORKING_DEFAULT_RULE_PROFILE.profileId,
        version: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
        status: WORKING_DEFAULT_RULE_PROFILE.status,
        profileDigest: defaultRuleDigest
      },
      storage: {
        databaseName: caseRepository.database.name,
        databaseSchemaVersion: CURRENT_RELEASE_DATABASE.targetSchema,
        fullBackupFormatVersion: FULL_BACKUP_FORMAT_VERSION,
        userDataPartitionCount: 15,
        caseCount: storageOverview.activeCaseCount,
        candidateSetCount: storageOverview.activeCandidateSetCount,
        revisionCount: storageOverview.activeRevisionCount
      },
      ruleRegistry,
      timeZoneDatabase: {
        snapshotId: RUNTIME_TZDB_VERSION,
        source: "bundled_iana_tzdb",
        ianaVersion: RUNTIME_TIME_ZONE_DATABASE.ianaVersion,
        artifactSha256: RUNTIME_TIME_ZONE_DATABASE.dataSha256,
        resolver: RUNTIME_TIME_ZONE_DATABASE.resolver,
        adapter: RUNTIME_TIME_ZONE_DATABASE.adapter,
        supportedRange: RUNTIME_TIME_ZONE_DATABASE.supportedRange,
        versionIdentified: true,
        hostIntlUsedForCalculation: false,
        hostIntlVersionExposed: false,
        artifactRegistryPolicy: "append_only_offline_bundled",
        retainedArtifacts: BUNDLED_TZDB_ARTIFACT_REGISTRY.map((snapshot) => ({
          snapshotId: snapshot.snapshotId,
          ianaVersion: snapshot.ianaVersion,
          artifactSha256: snapshot.dataSha256,
          active: snapshot.snapshotId === RUNTIME_TZDB_VERSION
        })),
        releaseBoundary: "计算固定使用随应用发布的内容寻址 IANA 数据；设备 Intl 版本未暴露，也不参与命名时区复算"
      },
      userAgent: navigator.userAgent,
      online: navigator.onLine
      };
      const delivery = await deliverTextFile(
        `hakimi-diagnostic-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "诊断文件导出"
      );
      if (!delivery) return;
      setMessage(`${delivery} 诊断不含出生资料、案例别名或笔记，但包含浏览器标识及规则包 ID/摘要。`);
    } catch (reason) {
      setFileTransferError(reason instanceof Error ? reason.message : "诊断文件导出失败。");
    }
  };

  const exportDefaultRulePack = async () => {
    setRulePackError(null);
    try {
      const envelope = await createWorkingDefaultRulePackEnvelope({ minAppVersion: "0.1.0" });
      const delivery = await deliverTextFile(
        "hakimi-rule-pack-working-default.json",
        await serializeRulePackEnvelope(envelope),
        "内置规则包导出"
      );
      if (!delivery) return;
      setMessage(`${delivery} 内容是带 SHA-256 摘要的规范内置规则包 JSON。`);
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包导出失败。");
    }
  };

  const exportGoldReviewBundle = async () => {
    setGoldAuditError(null);
    setMessage(null);
    try {
      const envelope = await createJieBoundaryReviewBundle();
      const delivery = await deliverTextFile(
        `hakimi-gold-review-jie-2024-${new Date().toISOString().slice(0, 10)}.json`,
        serializeGoldReviewBundle(envelope),
        "节气边界候选审核包导出"
      );
      if (!delivery) return;
      setMessage(`${delivery} 文件含 36 行节气边界候选，不含用户案例，也不会改变当前 0 金标状态。`);
    } catch (reason) {
      setGoldAuditError(reason instanceof Error ? reason.message : "金标准审核包导出失败。");
    }
  };

  const chooseGoldDecision = async () => {
    setGoldAuditError(null);
    setGoldDecisionPreview(null);
    setMessage(null);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      setGoldDecisionPreview(await preflightJieBoundaryDecision(file.text));
    } catch (reason) {
      setGoldAuditError(reason instanceof Error ? reason.message : "裁决记录预检失败。");
    }
  };

  const exportCalendarReviewBundle = async () => {
    setCalendarAuditBusy(true);
    setCalendarAuditError(null);
    setCalendarDecisionPreview(null);
    setMessage(null);
    try {
      const {
        createCalendarConversionReviewBundle,
        serializeCalendarConversionReviewBundle
      } = await import("@hakimi/gold-standard/lunar-conversion");
      const envelope = await createCalendarConversionReviewBundle();
      const delivery = await deliverTextFile(
        `hakimi-gold-review-calendar-conversion-${new Date().toISOString().slice(0, 10)}.json`,
        serializeCalendarConversionReviewBundle(envelope),
        "农历转换候选审核包导出"
      );
      if (!delivery) return;
      setCalendarReviewBundle(envelope);
      setMessage(`${delivery} 已载入 24 对农历转换候选、共 48 个方向断言；不含用户案例，当前仍为 0 条人工验证金标。`);
    } catch (reason) {
      setCalendarAuditError(reason instanceof Error ? reason.message : "农历审核包导出失败。");
    } finally {
      setCalendarAuditBusy(false);
    }
  };

  const chooseCalendarReviewBundle = async () => {
    setCalendarAuditBusy(true);
    setCalendarAuditError(null);
    setCalendarDecisionPreview(null);
    setMessage(null);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const { preflightCalendarConversionReviewBundle } = await import(
        "@hakimi/gold-standard/lunar-conversion"
      );
      const envelope = await preflightCalendarConversionReviewBundle(file.text);
      setCalendarReviewBundle(envelope);
      setMessage(`农历审核包已预检并载入当前页面：${file.name}。`);
    } catch (reason) {
      setCalendarReviewBundle(null);
      setCalendarAuditError(reason instanceof Error ? reason.message : "农历审核包预检失败。");
    } finally {
      setCalendarAuditBusy(false);
    }
  };

  const chooseCalendarDecision = async () => {
    setCalendarAuditError(null);
    setCalendarDecisionPreview(null);
    setMessage(null);
    if (!calendarReviewBundle) {
      setCalendarAuditError("请先导出当前审核包，或载入并预检复核人实际使用的审核包。");
      return;
    }
    setCalendarAuditBusy(true);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const { preflightCalendarConversionDecision } = await import(
        "@hakimi/gold-standard/lunar-conversion"
      );
      setCalendarDecisionPreview(await preflightCalendarConversionDecision(file.text, {
        reviewBundle: calendarReviewBundle
      }));
    } catch (reason) {
      setCalendarAuditError(reason instanceof Error ? reason.message : "农历双人裁决预检失败。");
    } finally {
      setCalendarAuditBusy(false);
    }
  };

  const exportTransitQueryReviewBundle = async () => {
    setTransitQueryAuditBusy(true);
    setTransitQueryAuditError(null);
    setTransitQueryIndependentReviewA(null);
    setTransitQueryIndependentReviewB(null);
    setTransitQueryAdjudicationPreview(null);
    setMessage(null);
    try {
      const {
        createTransitQueryReviewBundle,
        serializeTransitQueryReviewBundle
      } = await import("@hakimi/research-query/transit-review");
      const envelope = await createTransitQueryReviewBundle();
      const delivery = await deliverTextFile(
        `hakimi-transit-query-review-${new Date().toISOString().slice(0, 10)}.json`,
        serializeTransitQueryReviewBundle(envelope),
        "运限查询审核包导出"
      );
      if (!delivery) return;
      setTransitQueryReviewBundle(envelope);
      setMessage(`${delivery} 已载入 ${envelope.payload.candidates.length} 条运限查询工程候选；审核包不含用户案例，人工验证金标仍为 0。`);
    } catch (reason) {
      setTransitQueryAuditError(reason instanceof Error ? reason.message : "运限查询审核包导出失败。");
    } finally {
      setTransitQueryAuditBusy(false);
    }
  };

  const chooseTransitQueryReviewBundle = async () => {
    setTransitQueryAuditBusy(true);
    setTransitQueryAuditError(null);
    setTransitQueryIndependentReviewA(null);
    setTransitQueryIndependentReviewB(null);
    setTransitQueryAdjudicationPreview(null);
    setMessage(null);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const { preflightTransitQueryReviewBundle } = await import(
        "@hakimi/research-query/transit-review"
      );
      const envelope = await preflightTransitQueryReviewBundle(file.text);
      setTransitQueryReviewBundle(envelope);
      setMessage(`运限查询审核包已预检并绑定到当前页面：${file.name}。`);
    } catch (reason) {
      setTransitQueryReviewBundle(null);
      setTransitQueryAuditError(reason instanceof Error ? reason.message : "运限查询审核包预检失败。");
    } finally {
      setTransitQueryAuditBusy(false);
    }
  };

  const chooseTransitQueryIndependentReview = async (slot: "A" | "B") => {
    setTransitQueryAuditError(null);
    setTransitQueryAdjudicationPreview(null);
    setMessage(null);
    if (!transitQueryReviewBundle) {
      setTransitQueryAuditError("请先导出或载入并预检复核人实际使用的运限候选审核包。");
      return;
    }
    setTransitQueryAuditBusy(true);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 512 * 1024 });
      if (!file) return;
      const { preflightTransitQueryIndependentReview } = await import(
        "@hakimi/research-query/transit-review"
      );
      const result = await preflightTransitQueryIndependentReview(file.text, {
        reviewBundle: transitQueryReviewBundle
      });
      const otherReview = slot === "A" ? transitQueryIndependentReviewB : transitQueryIndependentReviewA;
      if (otherReview?.digest === result.envelope.digest) {
        throw new Error("两份独立审核不能是同一文件；请载入另一位现实身份审核人的独立记录。");
      }
      if (slot === "A") setTransitQueryIndependentReviewA(result.envelope);
      else setTransitQueryIndependentReviewB(result.envelope);
      setMessage(`独立审核 ${slot} 已完成结构预检：${file.name}。现实身份与来源真实性仍未验证，金标准仍为 0。`);
    } catch (reason) {
      if (slot === "A") setTransitQueryIndependentReviewA(null);
      else setTransitQueryIndependentReviewB(null);
      setTransitQueryAuditError(reason instanceof Error ? reason.message : `独立审核 ${slot} 预检失败。`);
    } finally {
      setTransitQueryAuditBusy(false);
    }
  };

  const chooseTransitQueryAdjudication = async () => {
    setTransitQueryAuditError(null);
    setTransitQueryAdjudicationPreview(null);
    setMessage(null);
    if (!transitQueryReviewBundle || !transitQueryIndependentReviewA || !transitQueryIndependentReviewB) {
      setTransitQueryAuditError("请先绑定候选审核包，并分别预检两份独立审核文件。");
      return;
    }
    setTransitQueryAuditBusy(true);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 512 * 1024 });
      if (!file) return;
      const { preflightTransitQueryAdjudication } = await import(
        "@hakimi/research-query/transit-review"
      );
      const result = await preflightTransitQueryAdjudication(file.text, {
        reviewBundle: transitQueryReviewBundle,
        independentReviews: [transitQueryIndependentReviewA, transitQueryIndependentReviewB]
      });
      setTransitQueryAdjudicationPreview(result);
      setMessage(`运限最终裁决已完成结构预检：${file.name}。尚未核验现实身份、写入 fixture 或增加专家金标准。`);
    } catch (reason) {
      setTransitQueryAuditError(reason instanceof Error ? reason.message : "运限最终裁决预检失败。");
    } finally {
      setTransitQueryAuditBusy(false);
    }
  };

  const chooseRulePack = async () => {
    setRulePackError(null);
    setMessage(null);
    setRulePackPreview(null);
    setRulePackPreviewIssues([]);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const preview = await verifyRulePackIntegrity(file.text);
      const issues = inspectRuleProfileCompatibility(preview.envelope.profile).reasons.map(
        (reason) => `${reason.path}：${reason.message}`
      );
      try {
        await preflightRulePack(file.text, { appVersion: APP_VERSION });
      } catch (reason) {
        issues.unshift(reason instanceof Error ? reason.message : "规则包与当前应用版本不兼容。");
      }
      setRulePackPreview(preview);
      setRulePackPreviewIssues(issues);
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包预检失败。");
    }
  };

  const installRulePackPreview = async () => {
    if (!rulePackPreview) return;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      const now = new Date().toISOString();
      const profile = rulePackPreview.envelope.profile;
      await ruleRegistryRepository.installRulePack(installedRulePackRecordSchema.parse({
        schemaVersion: "1.0.0",
        recordVersion: 1,
        recordType: "installed_rule_pack",
        id: rulePackPreview.digest,
        packDigest: rulePackPreview.digest,
        profileDigest: rulePackPreview.profileDigest,
        packId: rulePackPreview.envelope.metadata.packId,
        profileId: profile.profileId,
        profileVersion: profile.profileVersion,
        canonicalJson: rulePackPreview.canonicalJson,
        localTrust: "unverified_local_import",
        importedAt: now
      }));
      await refreshRuleRegistry();
      setMessage(`规则包“${rulePackPreview.envelope.metadata.title}”已保存到本机隔离库；尚未激活，来源仍未认证。`);
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包未能保存到本机仓库。");
    } finally {
      setRulePackBusy(false);
    }
  };

  const activateInstalledRulePack = async (record: InstalledRulePackRecord) => {
    if (!rulePackAcknowledgements[record.packDigest]) return;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      const audit = await inspectInstalledRulePackRecord(record, APP_VERSION);
      if (!audit.activatable) throw new Error(audit.issues.join("；") || "当前引擎不能完整执行此规则包。");
      const now = new Date().toISOString();
      await ruleRegistryRepository.activateRulePack(activeRulePackRecordSchema.parse({
        schemaVersion: "1.0.0",
        recordVersion: 1,
        recordType: "active_rule_pack",
        id: "active-rule-pack",
        activeDigest: record.packDigest,
        activeProfileDigest: record.profileDigest,
        activatedAt: now,
        approval: {
          status: "locally_approved_for_activation",
          acknowledgedAt: now,
          acknowledgementVersion: "rule-pack-local-approval@1",
          appVersion: APP_VERSION,
          engineName: ENGINE.name,
          engineVersion: ENGINE.version
        }
      }));
      await refreshRuleRegistry();
      setRulePackAcknowledgements({});
      setMessage(`规则包“${audit.title}”已由你在本机明确批准并激活；这不认证作者或顾问身份。`);
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包激活失败。");
    } finally {
      setRulePackBusy(false);
    }
  };

  const deactivateInstalledRulePack = async () => {
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      await ruleRegistryRepository.deactivateRulePack();
      await refreshRuleRegistry();
      setMessage("已明确停用第三方规则包；后续新排盘使用内置工作默认，历史修订保持不变。");
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包停用失败。");
    } finally {
      setRulePackBusy(false);
    }
  };

  const deleteInstalledRulePack = async (record: InstalledRulePackRecord) => {
    if (!window.confirm(`确认从本机删除 ${record.packId}@${record.profileVersion}？已绑定到历史修订的摘要字段不会被改写。`)) return;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      await ruleRegistryRepository.deleteInstalledRulePack(record.packDigest);
      await refreshRuleRegistry();
      setMessage("未激活的规则包已从本机仓库删除；完整备份中的副本不受影响。");
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包删除失败。");
    } finally {
      setRulePackBusy(false);
    }
  };

  const exportInstalledRulePack = async (record: InstalledRulePackRecord) => {
    setRulePackError(null);
    try {
      const delivery = await deliverTextFile(
        `hakimi-rule-pack-${record.packId}-${record.profileVersion}.json`,
        record.canonicalJson,
        "已安装规则包导出"
      );
      if (!delivery) return;
      setMessage(`${delivery} SHA-256 证明内容完整性，不证明发布者身份。`);
    } catch (reason) {
      setRulePackError(reason instanceof Error ? reason.message : "规则包导出失败。");
    }
  };

  const verifyRetainedTzdbArtifacts = async () => {
    setTzdbRegistryVerification({ status: "verifying", message: "正在载入历史时区数据并执行结构与行为哨兵……" });
    try {
      const snapshots = await verifyBundledTzdbArtifactRegistry();
      const retained = snapshots.filter((snapshot) => snapshot.snapshotId !== RUNTIME_TZDB_VERSION);
      setTzdbRegistryVerification({
        status: "passed",
        message: `历史时区数据 ${retained.length}/${retained.length} 已载入且行为哨兵通过，可在离线状态按该快照复核。原始字节 SHA 由发布门核对。`
      });
    } catch (reason) {
      setTzdbRegistryVerification({
        status: "failed",
        message: reason instanceof Error ? reason.message : "历史时区数据无法载入；不会改用当前版本代替。"
      });
    }
  };

  const goldEvidence = summarizeJieBoundaryEvidence();

  return (
    <div className="page">
      <PageHeading
        eyebrow="Local settings"
        title="设置与诊断"
        description="查看本地版本、计算边界与审核工具；完整备份、研究者资料、附件和删除操作集中在独立的数据管理页。"
        actions={<AppLink href="/help" className="secondary-action"><CircleHelp aria-hidden="true" />打开帮助与安全边界</AppLink>}
      />
      <div className="settings-grid">
        <section className="settings-section settings-section--wide settings-data-entry">
          <div className="settings-icon"><HardDrive aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Local data safety</p>
            <h2>数据管理与完整备份</h2>
            <p>集中查看十六个用户数据分区，编辑研究者资料与本机偏好，管理附件、规则包仓库、两类时间迁移凭证和 Revision 计算收据，并完成 ZIP/JSON 导出、写入前预检、安全快照和事务恢复。</p>
            <AppLink href="/settings/data" className="primary-action">打开数据管理</AppLink>
          </div>
        </section>

        <section className="settings-section settings-section--wide">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Gold-standard audit</p>
            <h2>金标准候选审核</h2>
            <p>项目发布门按十二类固定配额逐案计数，不能把同一候选重复填入不同类别。现有 {goldEvidence.total} 行节气边界数据均为回归候选，已验证 {goldEvidence.verified} 行；审核包把候选输入、四柱期望和规则配置分别绑定到 SHA-256 摘要，并要求两个不同身份的复核记录。</p>
            {projectGoldReport ? (
              <div className="rule-pack-preview" role="status">
                <strong>360 例项目发布门仍关闭</strong>
                <dl>
                  <div><dt>已登记候选</dt><dd>{projectGoldReport.counts.total} / {projectGoldReport.requiredGoldCaseCount}</dd></div>
                  <div><dt>人工已验证</dt><dd>{projectGoldReport.counts.verified}</dd></div>
                  <div><dt>剩余槽位</dt><dd>{projectGoldReport.remainingCaseSlots}</dd></div>
                  <div><dt>当前发布门</dt><dd>{projectGoldReport.releaseGatePassed ? "通过" : "未通过"}</dd></div>
                </dl>
                <details>
                  <summary>查看十二类固定配额</summary>
                  <ul>
                    {projectGoldReport.categories.map((category) => (
                      <li key={category.category}>{category.label}：已登记 {category.total}/{category.quota}，已验证 {category.verified}</li>
                    ))}
                  </ul>
                </details>
                <p>当前 36 条只计入“界月规则”，24 条只计入“公农历转换”；合计 60 个 candidate、0 个 verified。自动复算或软件一致不会提升人工金标。</p>
              </div>
            ) : <p role="status">正在载入项目级 360 配额登记表；载入完成前发布门保持关闭。</p>}
            {p003DiagnosticSummary ? (
              <div className="rule-pack-preview" role="status">
                <strong>20,000 例工程诊断已冻结，仍有历表差异待裁决</strong>
                <dl>
                  <div><dt>内部两遍一致</dt><dd>{p003DiagnosticSummary.internalDeterminism.deterministic} / {p003DiagnosticSummary.internalDeterminism.executed}</dd></div>
                  <div><dt>.NET 历法匹配</dt><dd>{p003DiagnosticSummary.calendarIndependentDifferential.matched} / {p003DiagnosticSummary.calendarIndependentDifferential.total}</dd></div>
                  <div><dt>未解决差异</dt><dd>{p003DiagnosticSummary.calendarIndependentDifferential.mismatch}（{p003DiagnosticSummary.calendarIndependentDifferential.differenceYears.join("、")}）</dd></div>
                  <div><dt>.NET 不支持</dt><dd>{p003DiagnosticSummary.calendarIndependentDifferential.unsupported}</dd></div>
                  <div><dt>报告摘要</dt><dd>{p003DiagnosticSummary.reportDigest}</dd></div>
                </dl>
                <p>内部一致只证明同一实现可复现；.NET 仅对照公历转农历日期，不是完整四柱真值。7 条差异保持“未解决历表差异”，人工金标增量仍为 0。</p>
                <AppLink href="/settings/calendar-divergence-audit" className="secondary-action">打开 2089 / 2097 连续窗口审计</AppLink>
              </div>
            ) : null}
            <div className="backup-actions">
              <button type="button" className="secondary-action" onClick={() => void exportGoldReviewBundle()}><Download aria-hidden="true" />导出 36 行审核包</button>
              <button type="button" className="secondary-action" onClick={() => void chooseGoldDecision()}><Upload aria-hidden="true" />预检双人裁决记录</button>
            </div>
            <p>摘要只能证明内容未变化，不能证明复核人身份。裁决预检只检查格式、绑定和双人字段；必须线下核验来源并纳入版本化 fixture，才可计入发布金标。</p>
            {goldDecisionPreview ? <div className="rule-pack-preview" role="status"><strong>裁决记录预检通过，尚未计入金标</strong><dl><div><dt>候选</dt><dd>{goldDecisionPreview.candidate.id}</dd></div><div><dt>决定</dt><dd>{goldDecisionPreview.envelope.payload.decision}</dd></div><div><dt>复核人</dt><dd>{goldDecisionPreview.envelope.payload.attestations.map((item) => item.displayName).join("、")}</dd></div><div><dt>摘要</dt><dd>{goldDecisionPreview.envelope.digest}</dd></div></dl><p>{goldDecisionPreview.notice}</p></div> : null}
            {goldAuditError ? <div className="inline-error" role="alert"><strong>金标准审核未完成</strong><p>{goldAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Transit query expert audit</p>
            <h2>运限查询专家审核</h2>
            <p>候选集以纯合成出生资料覆盖大运、小运、流年、流月、流日、流时，以及立春、交节、换日、换时、未知性别人工顺逆与不适用状态。这里审核的是目标瞬时点的稳定领域事实和应否命中，不要求专家为排序或界面内部字段签字。</p>
            <p>当前全部是工程候选，人工验证金标为 0。长期接收流程使用本地未核验收件箱：原始 JSON 内容寻址保存、随完整备份迁移，并在每次打开时重新绑定当前 fixture、候选、完整快照、查询、规则、时间轴和来源材料谱系。</p>
            <p>这仍是结构与完整性门禁，不是人员数字签名服务。现实身份、来源材料真伪和首次提交状态必须由维护者在线下可信账本核验；页面不会自动写入 fixture、增加金标或打开发布门。</p>
            <p><AppLink href="/settings/transit-review-inbox" className="primary-action">打开本地未核验审核收件箱</AppLink></p>
            <p>下面保留本次页面会话的快速分步预检；关闭或刷新后不保留 A/B 槽位。需要持久归档、自动按摘要关联和备份恢复时，请使用收件箱。</p>
            <div className="backup-actions">
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy} onClick={() => void exportTransitQueryReviewBundle()}><Download aria-hidden="true" />导出运限查询审核包</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy} onClick={() => void chooseTransitQueryReviewBundle()}><Upload aria-hidden="true" />载入运限审核包</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle} onClick={() => void chooseTransitQueryIndependentReview("A")}><Upload aria-hidden="true" />预检独立审核 A</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle} onClick={() => void chooseTransitQueryIndependentReview("B")}><Upload aria-hidden="true" />预检独立审核 B</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle || !transitQueryIndependentReviewA || !transitQueryIndependentReviewB} onClick={() => void chooseTransitQueryAdjudication()}><Upload aria-hidden="true" />预检运限最终裁决</button>
            </div>
            {transitQueryReviewBundle ? (
              <div className="rule-pack-preview" role="status">
                <strong>运限审核包已绑定到当前页面</strong>
                <dl>
                  <div><dt>候选</dt><dd>{transitQueryReviewBundle.payload.candidates.length} 条</dd></div>
                  <div><dt>生成时间</dt><dd>{transitQueryReviewBundle.payload.generatedAt}</dd></div>
                  <div><dt>审核包摘要</dt><dd>{transitQueryReviewBundle.digest}</dd></div>
                </dl>
                <p>审核包不包含真实用户案例；SHA-256 证明内容未变化，不证明复核人身份。</p>
              </div>
            ) : null}
            {transitQueryIndependentReviewA || transitQueryIndependentReviewB ? (
              <div className="rule-pack-preview" role="status">
                <strong>独立审核结构预检进度</strong>
                <dl>
                  <div><dt>审核 A</dt><dd>{transitQueryIndependentReviewA ? `${transitQueryIndependentReviewA.payload.reviewer.reviewerId} · ${transitQueryIndependentReviewA.payload.verdict}` : "尚未载入"}</dd></div>
                  <div><dt>审核 B</dt><dd>{transitQueryIndependentReviewB ? `${transitQueryIndependentReviewB.payload.reviewer.reviewerId} · ${transitQueryIndependentReviewB.payload.verdict}` : "尚未载入"}</dd></div>
                  <div><dt>现实身份</dt><dd>未验证，需维护者线下核验</dd></div>
                  <div><dt>当前金标</dt><dd>0</dd></div>
                </dl>
                <p>两个 reviewer ID 与离线身份记录摘要还会在最终裁决预检时交叉去重；仅载入两份文件不会提升证据等级。</p>
              </div>
            ) : null}
            {transitQueryAdjudicationPreview ? (
              <div className="rule-pack-preview" role="status">
                <strong>运限最终裁决结构预检通过，尚未计入金标</strong>
                <dl>
                  <div><dt>候选</dt><dd>{transitQueryAdjudicationPreview.candidate.id}</dd></div>
                  <div><dt>决定</dt><dd>{transitQueryAdjudicationPreview.envelope.payload.decision}</dd></div>
                  <div><dt>独立审核</dt><dd>{transitQueryAdjudicationPreview.independentReviews.map((review) => review.payload.reviewer.reviewerId).join("、")}</dd></div>
                  <div><dt>身份已验证</dt><dd>否</dd></div>
                  <div><dt>可自动写入 fixture</dt><dd>否</dd></div>
                  <div><dt>裁决摘要</dt><dd>{transitQueryAdjudicationPreview.envelope.digest}</dd></div>
                </dl>
                <p>{transitQueryAdjudicationPreview.notice}</p>
              </div>
            ) : null}
            {transitQueryAuditError ? <div className="inline-error" role="alert"><strong>运限查询审核未完成</strong><p>{transitQueryAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Lunar conversion audit</p>
            <h2>农历转换候选审核</h2>
            <p>当前冻结 24 对香港天文台权威历表候选，对应农历转公历与公历转农历共 48 个方向断言；独立 .NET Framework 4.8 差分为 23 对匹配、1 对超出其支持下界、0 个分歧。它们仍全部是 candidate，人工 verified 为 0。</p>
            <p>裁决必须绑定复核人实际看到的审核包。先导出或载入审核包，再预检双人裁决；整个流程只读，不会自动写入 fixture 或提升金标计数。</p>
            <div className="backup-actions">
              <button type="button" className="secondary-action" disabled={calendarAuditBusy} onClick={() => void exportCalendarReviewBundle()}><Download aria-hidden="true" />导出 24 对农历审核包</button>
              <button type="button" className="secondary-action" disabled={calendarAuditBusy} onClick={() => void chooseCalendarReviewBundle()}><Upload aria-hidden="true" />载入审核包预检</button>
              <button type="button" className="secondary-action" disabled={calendarAuditBusy || !calendarReviewBundle} onClick={() => void chooseCalendarDecision()}><Upload aria-hidden="true" />预检农历双人裁决</button>
            </div>
            {calendarReviewBundle ? (
              <div className="rule-pack-preview" role="status">
                <strong>审核包已绑定到当前页面</strong>
                <dl>
                  <div><dt>候选</dt><dd>{calendarReviewBundle.payload.candidates.length} 对 / 48 方向</dd></div>
                  <div><dt>生成时间</dt><dd>{calendarReviewBundle.payload.generatedAt}</dd></div>
                  <div><dt>数据集摘要</dt><dd>{calendarReviewBundle.payload.dataset.datasetDigest}</dd></div>
                  <div><dt>审核包摘要</dt><dd>{calendarReviewBundle.digest}</dd></div>
                </dl>
                <p>SHA-256 不是身份签名；关闭或刷新页面后需重新载入该审核包。</p>
              </div>
            ) : null}
            {calendarDecisionPreview ? (
              <div className="rule-pack-preview" role="status">
                <strong>农历裁决预检通过，尚未写入、尚未计入金标</strong>
                <dl>
                  <div><dt>候选</dt><dd>{calendarDecisionPreview.candidate.id}</dd></div>
                  <div><dt>日期对</dt><dd>{calendarDecisionPreview.effectiveExpected ? `${calendarDecisionPreview.effectiveExpected.lunarDate}${calendarDecisionPreview.effectiveExpected.lunarLeapMonth ? "（闰月）" : ""} → ${calendarDecisionPreview.effectiveExpected.gregorianDate}` : "拒绝候选，无生效日期对"}</dd></div>
                  <div><dt>决定</dt><dd>{calendarDecisionPreview.envelope.payload.decision}</dd></div>
                  <div><dt>复核人</dt><dd>{calendarDecisionPreview.envelope.payload.attestations.map((item) => item.displayName).join("、")}</dd></div>
                  <div><dt>现实身份已核验</dt><dd>{calendarDecisionPreview.identityVerified ? "是" : "否"}</dd></div>
                  <div><dt>来源真实性已核验</dt><dd>{calendarDecisionPreview.sourceAuthenticityVerified ? "是" : "否"}</dd></div>
                  <div><dt>可进入维护者整合</dt><dd>{calendarDecisionPreview.eligibleForFixtureIntegration ? "是" : "否"}</dd></div>
                  <div><dt>裁决摘要</dt><dd>{calendarDecisionPreview.envelope.digest}</dd></div>
                </dl>
                <p>{calendarDecisionPreview.notice}</p>
              </div>
            ) : null}
            {calendarAuditError ? <div className="inline-error" role="alert"><strong>农历审核未完成</strong><p>{calendarAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Declarative rule packs</p>
            <h2>规则包仓库与激活</h2>
            <p>只接受严格声明式 JSON；禁止可执行字段、原型污染键、URL 导入和未知字段。导入先进入本机隔离库，绝不自动激活。SHA-256 只能证明内容未变，包内“已审核”仍是作者自述；本机批准也不等于来源或顾问身份认证。</p>
            <p>当前真实应用版本为 <code>{APP_VERSION}</code>。预发布版低于同号正式版，例如 {APP_VERSION} 不会冒充已满足 0.2.0。</p>
            <div className="backup-actions"><button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => void exportDefaultRulePack()}><Download aria-hidden="true" />导出内置规则包</button><button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => void chooseRulePack()}><Upload aria-hidden="true" />选择规则包</button>{activeRulePack ? <button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => void deactivateInstalledRulePack()}>停用第三方包</button> : null}</div>
            {rulePackPreview ? <div className="rule-pack-preview" role="status"><strong>声明式完整性预检通过，可保存到隔离库</strong><dl><div><dt>标题</dt><dd>{rulePackPreview.envelope.metadata.title}</dd></div><div><dt>配置</dt><dd>{rulePackPreview.envelope.profile.profileId} {rulePackPreview.envelope.profile.profileVersion}</dd></div><div><dt>包内审核自述</dt><dd>{rulePackPreview.envelope.metadata.review.status}</dd></div><div><dt>包摘要</dt><dd>{rulePackPreview.digest}</dd></div><div><dt>Profile 摘要</dt><dd>{rulePackPreview.profileDigest}</dd></div><div><dt>当前可激活</dt><dd>{rulePackPreviewIssues.length === 0 ? "是" : "否；可保存研究"}</dd></div></dl>{rulePackPreviewIssues.length ? <ul className="warning-list">{rulePackPreviewIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}<button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => void installRulePackPreview()}>保存到本机隔离库</button></div> : null}
            <div className="rule-pack-preview" role="status">
              <strong>{activeRulePack ? "已激活一个本机导入规则包" : "当前使用内置工作默认"}</strong>
              <p>{activeRulePack ? `活动包 ${activeRulePack.activeDigest}；这是本机显式批准，不是身份认证。` : "没有第三方活动选择器；新排盘使用内置工作默认。"}</p>
            </div>
            {installedRulePacks.length ? <div className="rule-pack-library" aria-label="已安装规则包">
              {installedRulePacks.map((record) => {
                const audit = installedRulePackAudits[record.packDigest];
                const isActive = activeRulePack?.activeDigest === record.packDigest;
                return <article className="rule-pack-preview" key={record.packDigest}>
                  <strong>{audit?.title ?? `${record.packId}@${record.profileVersion}`}</strong>
                  <dl><div><dt>本机信任</dt><dd>导入未验证{isActive ? " · 本机已批准激活" : ""}</dd></div><div><dt>包内审核自述</dt><dd>{audit?.declaredReview ?? "读取失败"}</dd></div><div><dt>Profile</dt><dd>{record.profileId} {record.profileVersion}</dd></div><div><dt>摘要</dt><dd>{record.packDigest}</dd></div><div><dt>引擎能力</dt><dd>{audit?.activatable ? "完整支持" : "不可激活"}</dd></div></dl>
                  {audit?.issues.length ? <ul className="warning-list">{audit.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
                  {!isActive ? <label className="lunar-leap-toggle"><input type="checkbox" checked={Boolean(rulePackAcknowledgements[record.packDigest])} onChange={(event) => setRulePackAcknowledgements((current) => ({ ...current, [record.packDigest]: event.target.checked }))} /><span><strong>我确认只在本机使用此精确摘要</strong><small>我理解包内审核是自述、本机批准不认证身份，且只影响后续新计算。</small></span></label> : null}
                  <div className="backup-actions"><button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => void exportInstalledRulePack(record)}><Download aria-hidden="true" />导出</button>{!isActive ? <button type="button" className="secondary-action" disabled={rulePackBusy || !audit?.activatable || !rulePackAcknowledgements[record.packDigest]} onClick={() => void activateInstalledRulePack(record)}>按精确摘要激活</button> : null}<button type="button" className="danger-action" disabled={rulePackBusy || isActive} onClick={() => void deleteInstalledRulePack(record)}>删除</button></div>
                </article>;
              })}
            </div> : <p>本机隔离库暂无导入规则包。</p>}
            {rulePackError ? <div className="inline-error" role="alert"><strong>规则包操作未完成</strong><p>{rulePackError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">计算边界</p>
            <h2>传统子平工作默认</h2>
            <dl>
              <div><dt>应用版本</dt><dd>{APP_VERSION}</dd></div>
              <div><dt>规则版本</dt><dd>{WORKING_DEFAULT_RULE_PROFILE.profileVersion}</dd></div>
              <div><dt>验证状态</dt><dd><StatusPill tone="warning">{WORKING_DEFAULT_RULE_PROFILE.status}</StatusPill></dd></div>
              <div><dt>引擎</dt><dd>{ENGINE.name} {ENGINE.version}</dd></div>
              <div><dt>上游</dt><dd>{ENGINE.upstreamName} {ENGINE.upstreamVersion}</dd></div>
              <div><dt>数据库 Schema</dt><dd>Dexie {CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
              <div><dt>完整备份格式</dt><dd>{FULL_BACKUP_FORMAT_VERSION}</dd></div>
              <div><dt>时区数据库</dt><dd>IANA {RUNTIME_TIME_ZONE_DATABASE.ianaVersion} · 随应用锁定</dd></div>
              <div><dt>历史时区工件</dt><dd>{BUNDLED_TZDB_ARTIFACT_REGISTRY.filter((snapshot) => snapshot.snapshotId !== RUNTIME_TZDB_VERSION).map((snapshot) => `IANA ${snapshot.ianaVersion}`).join("、")} · 随当前应用构建保留</dd></div>
              <div><dt>tzdb 数据摘要</dt><dd className="mono" title={RUNTIME_TIME_ZONE_DATABASE.dataSha256}>{RUNTIME_TIME_ZONE_DATABASE.dataSha256}</dd></div>
              <div><dt>时区解析器</dt><dd>{RUNTIME_TIME_ZONE_DATABASE.resolver.name} {RUNTIME_TIME_ZONE_DATABASE.resolver.version}</dd></div>
            </dl>
            <div className="backup-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={tzdbRegistryVerification.status === "verifying"}
                onClick={() => void verifyRetainedTzdbArtifacts()}
              >
                <ShieldCheck aria-hidden="true" />加载并检查历史时区数据
              </button>
            </div>
            <p role="status">
              <StatusPill tone={tzdbRegistryVerification.status === "passed" ? "jade" : tzdbRegistryVerification.status === "failed" ? "cinnabar" : "info"}>
                {tzdbRegistryVerification.status === "passed" ? "历史复核可用" : tzdbRegistryVerification.status === "failed" ? "失败关闭" : tzdbRegistryVerification.status === "verifying" ? "正在验证" : "尚未验证"}
              </StatusPill>{" "}{tzdbRegistryVerification.message}
            </p>
            <p>{WORKING_DEFAULT_RULE_PROFILE.notice}</p>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-icon"><Download aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">诊断</p>
            <h2>导出不含命盘内容的诊断文件</h2>
            <p>包含应用、引擎、数据库、备份、tzdb 边界、规则包 ID/摘要、记录数量、浏览器标识与在线状态；不包含出生资料、案例别名或笔记。</p>
            <button type="button" className="secondary-action" onClick={() => void exportDiagnostic()}><Download aria-hidden="true" />导出诊断 JSON</button>
          </div>
        </section>
      </div>
      {fileTransferError ? <div className="inline-error" role="alert"><strong>文件操作未完成</strong><p>{fileTransferError}</p></div> : null}
      {message ? <p className="success-message settings-message" role="status">{message}</p> : null}
    </div>
  );
}
