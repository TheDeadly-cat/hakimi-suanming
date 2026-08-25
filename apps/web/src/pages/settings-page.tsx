import { Download, HardDrive, ShieldCheck, Upload } from "lucide-react";
import { CircleHelp, X } from "lucide-react";
import { Activity } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { pickTextFile, saveTextFile, webReportExportPort } from "@hakimi/platform";
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
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "../components/prepared-file-delivery-dialog";
import { StatusPill } from "../components/status-pill";
import { useExpertMode } from "../lib/expert-mode";
import {
  collectResourceReport,
  formatBytes,
  useLongTaskMonitor,
  type ResourceReportSnapshot
} from "../lib/resource-report";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { formatDateTime } from "../lib/format";
import { APP_VERSION } from "../lib/app-version";
import {
  CURRENT_BUILD_VERSION,
  CURRENT_RELEASE_DATABASE,
  CURRENT_RELEASE_EVIDENCE_BOUND,
  CURRENT_RELEASE_EVIDENCE_ID,
  CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST
} from "../lib/current-release";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import { inspectInstalledRulePackRecord, type InstalledRulePackAudit } from "../lib/active-rule-pack";
import "./settings-page.css";

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

type ResourceEvidenceState = "ready" | "partial" | "unavailable";

const SETTINGS_DIAGNOSTIC_BYTE_LIMIT = 512 * 1024;

type RuleRegistrySnapshot = {
  installed: InstalledRulePackRecord[];
  active: ActiveRulePackRecord | null;
  audits: Record<string, InstalledRulePackAudit>;
};

function isUsableByteValue(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

function storageEvidenceState(storage: ResourceReportSnapshot["storage"]): ResourceEvidenceState {
  if (!storage.supported) return "unavailable";
  return isUsableByteValue(storage.usageBytes) && isUsableByteValue(storage.quotaBytes)
    ? "ready"
    : "partial";
}

function formatStorageEvidence(storage: ResourceReportSnapshot["storage"]): string {
  if (!storage.supported) return safeVisibleText(storage.error, "当前浏览器未提供站点存储估算", 600);
  const usage = storage.usageBytes;
  const quota = storage.quotaBytes;
  if (!isUsableByteValue(usage) || !isUsableByteValue(quota)) {
    return "接口可用，但未返回完整的用量与配额；不据此报告零值。";
  }
  return `${formatBytes(usage)} / ${formatBytes(quota)}`;
}

function memoryEvidenceState(memory: ResourceReportSnapshot["memory"]): ResourceEvidenceState {
  if (!memory.supported) return "unavailable";
  return isUsableByteValue(memory.usedJSHeapSizeBytes) && isUsableByteValue(memory.totalJSHeapSizeBytes)
    ? "ready"
    : "partial";
}

function formatMemoryEvidence(memory: ResourceReportSnapshot["memory"]): string {
  if (!memory.supported) return "当前浏览器未暴露 JS 堆内存";
  const used = memory.usedJSHeapSizeBytes;
  const total = memory.totalJSHeapSizeBytes;
  if (!isUsableByteValue(used) || !isUsableByteValue(total)) {
    return "接口已暴露，但本次未返回完整堆内存值；不据此报告零值。";
  }
  return `${formatBytes(used)} 已用 / ${formatBytes(total)} 总量`;
}

function resourceEvidenceLabel(state: ResourceEvidenceState): string {
  if (state === "ready") return "可用";
  if (state === "partial") return "部分";
  return "不可用";
}

const FROZEN_JIE_BOUNDARY_EVIDENCE = summarizeJieBoundaryEvidence();
const RETAINED_TZDB_LABEL = BUNDLED_TZDB_ARTIFACT_REGISTRY
  .filter((snapshot) => snapshot.snapshotId !== RUNTIME_TZDB_VERSION)
  .map((snapshot) => `IANA ${snapshot.ianaVersion}`)
  .join("、");

function ruleRegistryIntegrityIssue(
  installed: readonly InstalledRulePackRecord[],
  active: ActiveRulePackRecord | null
): string | null {
  if (new Set(installed.map((record) => record.packDigest)).size !== installed.length) {
    return "规则包仓库包含重复包摘要。";
  }
  if (new Set(installed.map((record) => record.id)).size !== installed.length) {
    return "规则包仓库包含重复记录 ID。";
  }
  if (installed.some((record) => !Number.isFinite(Date.parse(record.importedAt)))) {
    return "规则包仓库包含无效导入时间。";
  }
  if (!active) return null;
  if (
    !Number.isFinite(Date.parse(active.activatedAt)) ||
    !Number.isFinite(Date.parse(active.approval.acknowledgedAt))
  ) {
    return "活动规则包选择器包含无效批准时间。";
  }
  const target = installed.find((record) => record.packDigest === active.activeDigest);
  if (!target) return "活动规则包选择器指向隔离库中不存在的包摘要。";
  if (target.profileDigest !== active.activeProfileDigest) {
    return "活动规则包选择器的 Profile 摘要与隔离库记录不一致。";
  }
  return null;
}

function orderInstalledRulePacks(records: readonly InstalledRulePackRecord[]): InstalledRulePackRecord[] {
  return [...records].sort((left, right) => {
    const timestampOrder = Date.parse(right.importedAt) - Date.parse(left.importedAt);
    if (timestampOrder !== 0) return timestampOrder;
    return left.packDigest < right.packDigest ? -1 : left.packDigest > right.packDigest ? 1 : 0;
  });
}

async function buildRuleRegistryDiagnostic() {
  try {
    const [installed, active] = await Promise.all([
      ruleRegistryRepository.listInstalledRulePacks(),
      ruleRegistryRepository.getActiveRulePack()
    ]);
    const integrityIssue = ruleRegistryIntegrityIssue(installed, active);
    if (integrityIssue) throw new Error(integrityIssue);
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
      error: safeVisibleErrorMessage(reason, "规则包仓库无法读取")
    };
  }
}

type RuleRegistryCommitIssue =
  | {
      kind: "install";
      operationLabel: string;
      targetLabel: string;
      packDigest: string;
      profileDigest: string;
      canonicalJson: string;
      detail: string;
    }
  | {
      kind: "activate";
      operationLabel: string;
      targetLabel: string;
      packDigest: string;
      profileDigest: string;
      detail: string;
    }
  | {
      kind: "deactivate" | "delete";
      operationLabel: string;
      targetLabel: string;
      packDigest: string;
      detail: string;
    };

const SETTINGS_SECTION_IDS = [
  "settings-data",
  "settings-audit-gold",
  "settings-rule-packs",
  "settings-runtime",
  "settings-diagnostic"
] as const;

type SettingsSectionId = typeof SETTINGS_SECTION_IDS[number];

const SETTINGS_SECTION_TARGETS: readonly Readonly<{
  targetId: string;
  navigationId: SettingsSectionId;
}>[] = [
  { targetId: "settings-data", navigationId: "settings-data" },
  { targetId: "settings-audit-gold", navigationId: "settings-audit-gold" },
  { targetId: "settings-audit-transit", navigationId: "settings-audit-gold" },
  { targetId: "settings-audit-calendar", navigationId: "settings-audit-gold" },
  { targetId: "settings-rule-packs", navigationId: "settings-rule-packs" },
  { targetId: "settings-runtime", navigationId: "settings-runtime" },
  { targetId: "settings-diagnostic", navigationId: "settings-diagnostic" },
  { targetId: "settings-expert-mode", navigationId: "settings-diagnostic" },
  { targetId: "settings-resources", navigationId: "settings-diagnostic" }
];

export function SettingsPage() {
  const { expertMode, setExpertMode } = useExpertMode();
  const { samples: longTaskSamples, supported: longTaskSupported } = useLongTaskMonitor();
  const [resourceReport, setResourceReport] = useState<ResourceReportSnapshot | null>(null);
  const [resourceBusy, setResourceBusy] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fileTransferError, setFileTransferError] = useState<string | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const [rulePackPreview, setRulePackPreview] = useState<RulePackIntegrityResult | null>(null);
  const [rulePackPreviewIssues, setRulePackPreviewIssues] = useState<string[]>([]);
  const [installedRulePacks, setInstalledRulePacks] = useState<InstalledRulePackRecord[]>([]);
  const [installedRulePackAudits, setInstalledRulePackAudits] = useState<Record<string, InstalledRulePackAudit>>({});
  const [activeRulePack, setActiveRulePack] = useState<ActiveRulePackRecord | null>(null);
  const [rulePackAcknowledgements, setRulePackAcknowledgements] = useState<Record<string, boolean>>({});
  const [ruleRegistryStatus, setRuleRegistryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ruleRegistryError, setRuleRegistryError] = useState<string | null>(null);
  const [rulePackBusy, setRulePackBusy] = useState(false);
  const [rulePackError, setRulePackError] = useState<string | null>(null);
  const [rulePackDeleteDigest, setRulePackDeleteDigest] = useState<string | null>(null);
  const [ruleRegistryCommitIssue, setRuleRegistryCommitIssue] = useState<RuleRegistryCommitIssue | null>(null);
  const [goldDecisionPreview, setGoldDecisionPreview] = useState<GoldDecisionPreflight | null>(null);
  const [goldAuditError, setGoldAuditError] = useState<string | null>(null);
  const [projectGoldReport, setProjectGoldReport] = useState<ProjectGoldReleaseGateReport | null>(null);
  const [projectGoldStatus, setProjectGoldStatus] = useState<"loading" | "ready" | "error">("loading");
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
  const [activeSettingsOperation, setActiveSettingsOperation] = useState<string | null>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionId>("settings-data");
  const settingsOperationLockRef = useRef(false);
  const ruleRegistryRequestVersionRef = useRef(0);
  const ruleRegistryMutationLockRef = useRef(false);
  const settingsOperationBusy = activeSettingsOperation !== null;
  const ruleRegistryMutationLocked = ruleRegistryCommitIssue !== null;
  const rulePackDeleteConfirmationOpen = rulePackDeleteDigest !== null;
  const settingsBackgroundLoading = ruleRegistryStatus === "loading" || projectGoldStatus === "loading";
  const settingsControlState = settingsOperationBusy
    ? "busy"
    : ruleRegistryMutationLocked
      ? "reconciliation"
      : settingsBackgroundLoading
        ? "checking"
        : "idle";

  const runSettingsOperation = useCallback((label: string, operation: () => Promise<unknown>) => {
    if (settingsOperationLockRef.current) return;
    settingsOperationLockRef.current = true;
    setActiveSettingsOperation(label);
    setFileTransferError(null);
    setMessage(null);
    void Promise.resolve()
      .then(operation)
      .catch((reason: unknown) => {
        setFileTransferError(`${label}未完成：${safeVisibleErrorMessage(reason, "发生未知错误。")}`);
      })
      .finally(() => {
        settingsOperationLockRef.current = false;
        setActiveSettingsOperation(null);
      });
  }, []);

  const refreshRuleRegistry = async (): Promise<RuleRegistrySnapshot> => {
    const requestVersion = ruleRegistryRequestVersionRef.current + 1;
    ruleRegistryRequestVersionRef.current = requestVersion;
    setRuleRegistryStatus("loading");
    setRuleRegistryError(null);
    setInstalledRulePacks([]);
    setInstalledRulePackAudits({});
    setActiveRulePack(null);
    setRulePackAcknowledgements({});
    setRulePackDeleteDigest(null);
    try {
      const [installed, active] = await Promise.all([
        ruleRegistryRepository.listInstalledRulePacks(),
        ruleRegistryRepository.getActiveRulePack()
      ]);
      const integrityIssue = ruleRegistryIntegrityIssue(installed, active);
      if (integrityIssue) throw new Error(integrityIssue);
      const orderedInstalled = orderInstalledRulePacks(installed);
      const auditList = await Promise.all(orderedInstalled.map((record) => inspectInstalledRulePackRecord(record, APP_VERSION)));
      if (requestVersion !== ruleRegistryRequestVersionRef.current) {
        throw new Error("规则包仓库读取已被更新请求取代；旧结果没有进入页面状态。");
      }
      const audits = Object.fromEntries(auditList.map((audit) => [audit.record.packDigest, audit]));
      setInstalledRulePacks(orderedInstalled);
      setActiveRulePack(active);
      setInstalledRulePackAudits(audits);
      setRuleRegistryStatus("ready");
      return { installed: orderedInstalled, active, audits };
    } catch (reason) {
      if (requestVersion === ruleRegistryRequestVersionRef.current) {
        setRuleRegistryError(safeVisibleErrorMessage(reason, "规则包仓库读取失败。"));
        setRuleRegistryStatus("error");
      }
      throw reason;
    }
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
          setProjectGoldStatus("ready");
        }
      })
      .catch(() => {
        if (active) {
          setProjectGoldStatus("error");
          setGoldAuditError("项目级 360 配额登记表载入失败；发布门保持关闭。");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void refreshRuleRegistry().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== "function") return;

    const sectionIdByTarget = new Map<Element, SettingsSectionId>();
    for (const target of SETTINGS_SECTION_TARGETS) {
      const section = document.getElementById(target.targetId);
      if (section) sectionIdByTarget.set(section, target.navigationId);
    }
    if (!sectionIdByTarget.size) return;

    const observer = new window.IntersectionObserver((entries) => {
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      if (!visibleEntries.length) return;
      const readingLine = Math.max(96, window.innerHeight * 0.16);
      visibleEntries.sort((left, right) => (
        Math.abs(left.boundingClientRect.top - readingLine) - Math.abs(right.boundingClientRect.top - readingLine)
      ));
      const nextSection = sectionIdByTarget.get(visibleEntries[0]!.target);
      if (nextSection) setActiveSettingsSection(nextSection);
    }, {
      rootMargin: "-88px 0px -55% 0px",
      threshold: [0, 0.01, 0.25]
    });

    for (const target of sectionIdByTarget.keys()) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const deliverTextFile = async (
    filename: string,
    content: string,
    subject: string
  ): Promise<string | null> => {
    setFileTransferError(null);
    setMessage(null);
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
      release: {
        buildVersion: CURRENT_BUILD_VERSION,
        evidenceId: CURRENT_RELEASE_EVIDENCE_ID,
        evidenceBound: CURRENT_RELEASE_EVIDENCE_BOUND,
        manifestDigest: CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST,
        descriptor: CURRENT_RELEASE_DATABASE,
        engineeringEvidenceOnly: true,
        expertValidationImplied: false
      },
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
        userDataPartitionCount: 16,
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
      const diagnosticContent = `${JSON.stringify(payload, null, 2)}\n`;
      const diagnosticBlob = new Blob([diagnosticContent], { type: "application/json;charset=utf-8" });
      if (
        !Number.isSafeInteger(diagnosticBlob.size)
        || diagnosticBlob.size <= 0
        || diagnosticBlob.size > SETTINGS_DIAGNOSTIC_BYTE_LIMIT
      ) {
        throw new Error(`诊断 JSON 超出 ${formatBytes(SETTINGS_DIAGNOSTIC_BYTE_LIMIT)} 安全预算。`);
      }
      const diagnosticDate = new Date().toISOString().slice(0, 10);
      setPreparedDelivery({
        blob: diagnosticBlob,
        filename: `hakimi-diagnostic-${diagnosticDate}.json`,
        title: `本机诊断快照 · ${diagnosticDate}`,
        sharePolicy: "blocked_sensitive",
        description: "诊断不含出生资料、案例别名或笔记，但包含数据库名称、浏览器标识、在线状态、记录数量以及规则包 ID/摘要；只能下载或保存到可信位置，不能进入系统分享。"
      });
      setMessage(`诊断 JSON 已冻结为 ${formatBytes(diagnosticBlob.size)} 并准备交付；同一份内容将用于下载或指定位置保存，目前尚未发生交付，系统分享保持关闭。`);
    } catch (reason) {
      setFileTransferError(safeVisibleErrorMessage(reason, "诊断文件未能完成冻结准备。"));
    }
  };

  const refreshResourceReport = async () => {
    setResourceBusy(true);
    setResourceError(null);
    setResourceReport(null);
    try {
      setResourceReport(await collectResourceReport({ longTasks: longTaskSamples }));
    } catch (reason) {
      setResourceError(safeVisibleErrorMessage(reason, "资源与性能报告生成失败"));
    } finally {
      setResourceBusy(false);
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
      setRulePackError(safeVisibleErrorMessage(reason, "规则包导出失败。"));
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
      setGoldAuditError(safeVisibleErrorMessage(reason, "金标准审核包导出失败。"));
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
      setGoldAuditError(safeVisibleErrorMessage(reason, "裁决记录预检失败。"));
    }
  };

  const exportCalendarReviewBundle = async () => {
    setCalendarAuditBusy(true);
    setCalendarAuditError(null);
    setCalendarReviewBundle(null);
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
      setCalendarAuditError(safeVisibleErrorMessage(reason, "农历审核包导出失败。"));
    } finally {
      setCalendarAuditBusy(false);
    }
  };

  const chooseCalendarReviewBundle = async () => {
    setCalendarAuditBusy(true);
    setCalendarAuditError(null);
    setCalendarReviewBundle(null);
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
      setCalendarAuditError(safeVisibleErrorMessage(reason, "农历审核包预检失败。"));
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
      setCalendarAuditError(safeVisibleErrorMessage(reason, "农历双人裁决预检失败。"));
    } finally {
      setCalendarAuditBusy(false);
    }
  };

  const exportTransitQueryReviewBundle = async () => {
    setTransitQueryAuditBusy(true);
    setTransitQueryAuditError(null);
    setTransitQueryReviewBundle(null);
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
      setTransitQueryAuditError(safeVisibleErrorMessage(reason, "运限查询审核包导出失败。"));
    } finally {
      setTransitQueryAuditBusy(false);
    }
  };

  const chooseTransitQueryReviewBundle = async () => {
    setTransitQueryAuditBusy(true);
    setTransitQueryAuditError(null);
    setTransitQueryReviewBundle(null);
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
      setTransitQueryAuditError(safeVisibleErrorMessage(reason, "运限查询审核包预检失败。"));
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
      setTransitQueryAuditError(safeVisibleErrorMessage(reason, `独立审核 ${slot} 预检失败。`));
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
      setTransitQueryAuditError(safeVisibleErrorMessage(reason, "运限最终裁决预检失败。"));
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
        issues.unshift(safeVisibleErrorMessage(reason, "规则包与当前应用版本不兼容。"));
      }
      setRulePackPreview(preview);
      setRulePackPreviewIssues(issues);
    } catch (reason) {
      setRulePackError(safeVisibleErrorMessage(reason, "规则包预检失败。"));
    }
  };

  const retainRuleRegistryCommitIssue = (issue: RuleRegistryCommitIssue) => {
    ruleRegistryMutationLockRef.current = true;
    setRulePackDeleteDigest(null);
    setRuleRegistryCommitIssue(issue);
    setRulePackError(null);
  };

  const recheckRuleRegistryCommitIssue = async () => {
    const issue = ruleRegistryCommitIssue;
    if (!issue) return;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      const refreshed = await refreshRuleRegistry();
      let confirmation: string;
      switch (issue.kind) {
        case "install": {
          const stored = refreshed.installed.find((record) => record.packDigest === issue.packDigest);
          if (
            !stored ||
            stored.profileDigest !== issue.profileDigest ||
            stored.canonicalJson !== issue.canonicalJson
          ) {
            throw new Error("重读完成，但隔离库仍不能证明包摘要、Profile 摘要与规范 JSON 精确匹配本次保存目标。");
          }
          confirmation = "隔离库已包含与保存目标完全一致的规则包";
          break;
        }
        case "activate":
          if (
            refreshed.active?.activeDigest !== issue.packDigest ||
            refreshed.active.activeProfileDigest !== issue.profileDigest
          ) {
            throw new Error("重读完成，但活动选择器仍不能证明包摘要与 Profile 摘要精确匹配本次激活目标。");
          }
          confirmation = "活动选择器已精确指向本次批准的规则包";
          break;
        case "deactivate":
          if (refreshed.active !== null) {
            throw new Error("重读完成，但活动选择器仍然存在，不能确认第三方规则包已经停用。");
          }
          confirmation = "活动选择器已经移除，后续新计算回到内置工作默认";
          break;
        case "delete":
          if (refreshed.installed.some((record) => record.packDigest === issue.packDigest)) {
            throw new Error("重读完成，但隔离库仍包含同一包摘要，不能确认删除已经完成。");
          }
          confirmation = "隔离库已不再包含本次删除的包摘要";
          break;
      }
      ruleRegistryMutationLockRef.current = false;
      setRuleRegistryCommitIssue(null);
      setMessage(`只读重读已确认：${confirmation}。这只证明本机仓库状态，不认证来源、作者或顾问身份。`);
    } catch (reason) {
      const detail = safeVisibleErrorMessage(reason, "规则包仓库只读核对失败。");
      ruleRegistryMutationLockRef.current = true;
      setRuleRegistryCommitIssue((current) => current ? { ...current, detail } : { ...issue, detail });
      setRulePackError(null);
    } finally {
      setRulePackBusy(false);
    }
  };

  const installRulePackPreview = async () => {
    if (!rulePackPreview || ruleRegistryMutationLockRef.current) return;
    let repositoryWriteAttempted = false;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      const now = new Date().toISOString();
      const profile = rulePackPreview.envelope.profile;
      const recordToInstall = installedRulePackRecordSchema.parse({
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
      });
      repositoryWriteAttempted = true;
      await ruleRegistryRepository.installRulePack(recordToInstall);
      const refreshed = await refreshRuleRegistry();
      const stored = refreshed.installed.find((record) => record.packDigest === rulePackPreview.digest);
      if (
        !stored ||
        stored.profileDigest !== rulePackPreview.profileDigest ||
        stored.canonicalJson !== rulePackPreview.canonicalJson
      ) {
        throw new Error("规则包可能已经写入，但重读仓库无法证明包摘要、Profile 摘要与规范 JSON 仍和预检结果一致。");
      }
      setMessage(`规则包“${rulePackPreview.envelope.metadata.title}”已保存到本机隔离库；尚未激活，来源仍未认证。`);
    } catch (reason) {
      const detail = safeVisibleErrorMessage(reason, "规则包保存后的仓库核对失败。");
      if (repositoryWriteAttempted) {
        retainRuleRegistryCommitIssue({
          kind: "install",
          operationLabel: "保存到本机隔离库",
          targetLabel: `${rulePackPreview.envelope.metadata.packId}@${rulePackPreview.envelope.profile.profileVersion}`,
          packDigest: rulePackPreview.digest,
          profileDigest: rulePackPreview.profileDigest,
          canonicalJson: rulePackPreview.canonicalJson,
          detail
        });
        return;
      }
      setRulePackError(safeVisibleErrorMessage(reason, "规则包未能保存到本机仓库。"));
    } finally {
      setRulePackBusy(false);
    }
  };

  const activateInstalledRulePack = async (record: InstalledRulePackRecord) => {
    if (!rulePackAcknowledgements[record.packDigest] || ruleRegistryMutationLockRef.current) return;
    let repositoryWriteAttempted = false;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      const audit = await inspectInstalledRulePackRecord(record, APP_VERSION);
      if (!audit.activatable) throw new Error(audit.issues.join("；") || "当前引擎不能完整执行此规则包。");
      const now = new Date().toISOString();
      const activeSelection = activeRulePackRecordSchema.parse({
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
      });
      repositoryWriteAttempted = true;
      await ruleRegistryRepository.activateRulePack(activeSelection);
      const refreshed = await refreshRuleRegistry();
      if (
        refreshed.active?.activeDigest !== record.packDigest ||
        refreshed.active.activeProfileDigest !== record.profileDigest
      ) {
        throw new Error("激活请求可能已经写入，但重读选择器无法证明当前活动包与本次批准的精确摘要一致。");
      }
      setRulePackAcknowledgements({});
      setMessage(`规则包“${audit.title}”已由你在本机明确批准并激活；这不认证作者或顾问身份。`);
    } catch (reason) {
      const detail = safeVisibleErrorMessage(reason, "规则包激活后的仓库核对失败。");
      if (repositoryWriteAttempted) {
        retainRuleRegistryCommitIssue({
          kind: "activate",
          operationLabel: "按精确摘要激活",
          targetLabel: `${record.packId}@${record.profileVersion}`,
          packDigest: record.packDigest,
          profileDigest: record.profileDigest,
          detail
        });
        return;
      }
      setRulePackError(safeVisibleErrorMessage(reason, "规则包激活失败。"));
    } finally {
      setRulePackBusy(false);
    }
  };

  const deactivateInstalledRulePack = async () => {
    if (ruleRegistryMutationLockRef.current) return;
    const targetDigest = activeRulePack?.activeDigest ?? "unknown-active-digest";
    let repositoryWriteAttempted = false;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      repositoryWriteAttempted = true;
      await ruleRegistryRepository.deactivateRulePack();
      const refreshed = await refreshRuleRegistry();
      if (refreshed.active !== null) {
        throw new Error("停用请求可能已经写入，但重读后活动选择器仍然存在，因此不能声明停用成功。");
      }
      setMessage("已明确停用第三方规则包；后续新排盘使用内置工作默认，历史修订保持不变。");
    } catch (reason) {
      const detail = safeVisibleErrorMessage(reason, "规则包停用后的仓库核对失败。");
      if (repositoryWriteAttempted) {
        retainRuleRegistryCommitIssue({
          kind: "deactivate",
          operationLabel: "停用第三方规则包",
          targetLabel: "当前活动选择器",
          packDigest: targetDigest,
          detail
        });
        return;
      }
      setRulePackError(safeVisibleErrorMessage(reason, "规则包停用失败。"));
    } finally {
      setRulePackBusy(false);
    }
  };

  const deleteInstalledRulePack = async (record: InstalledRulePackRecord) => {
    if (ruleRegistryMutationLockRef.current || rulePackDeleteDigest !== record.packDigest) return;
    setRulePackDeleteDigest(null);
    let repositoryWriteAttempted = false;
    setRulePackBusy(true);
    setRulePackError(null);
    try {
      repositoryWriteAttempted = true;
      await ruleRegistryRepository.deleteInstalledRulePack(record.packDigest);
      const refreshed = await refreshRuleRegistry();
      if (refreshed.installed.some((item) => item.packDigest === record.packDigest)) {
        throw new Error("删除请求可能已经执行，但重读仓库仍包含同一包摘要，因此不能声明删除成功。");
      }
      setMessage("未激活的规则包已从本机仓库删除；完整备份中的副本不受影响。");
    } catch (reason) {
      const detail = safeVisibleErrorMessage(reason, "规则包删除后的仓库核对失败。");
      if (repositoryWriteAttempted) {
        retainRuleRegistryCommitIssue({
          kind: "delete",
          operationLabel: "删除本机隔离包",
          targetLabel: `${record.packId}@${record.profileVersion}`,
          packDigest: record.packDigest,
          detail
        });
        return;
      }
      setRulePackError(safeVisibleErrorMessage(reason, "规则包删除失败。"));
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
      setRulePackError(safeVisibleErrorMessage(reason, "规则包导出失败。"));
    }
  };

  const verifyRetainedTzdbArtifacts = async () => {
    setTzdbRegistryVerification({ status: "verifying", message: "正在载入历史时区数据并执行结构与行为哨兵……" });
    try {
      const snapshots = await verifyBundledTzdbArtifactRegistry();
      const expectedSnapshotIds = new Set(BUNDLED_TZDB_ARTIFACT_REGISTRY.map((snapshot) => snapshot.snapshotId));
      if (
        snapshots.length !== expectedSnapshotIds.size ||
        snapshots.some((snapshot) => !expectedSnapshotIds.has(snapshot.snapshotId))
      ) {
        throw new Error("历史时区验证结果没有覆盖当前构建登记的全部快照，已保持失败关闭。");
      }
      const retained = snapshots.filter((snapshot) => snapshot.snapshotId !== RUNTIME_TZDB_VERSION);
      const expectedRetained = BUNDLED_TZDB_ARTIFACT_REGISTRY.filter((snapshot) => snapshot.snapshotId !== RUNTIME_TZDB_VERSION).length;
      setTzdbRegistryVerification({
        status: "passed",
        message: `历史时区数据 ${retained.length}/${expectedRetained} 已载入且行为哨兵通过，可在离线状态按该快照复核。原始字节 SHA 由发布门核对。`
      });
    } catch (reason) {
      setTzdbRegistryVerification({
        status: "failed",
        message: safeVisibleErrorMessage(reason, "历史时区数据无法载入；不会改用当前版本代替。")
      });
    }
  };

  const projectGateState = projectGoldStatus === "ready"
    ? projectGoldReport?.releaseGatePassed ? "passed" : "closed"
    : projectGoldStatus;
  const projectGateLabel = projectGateState === "passed"
    ? "工程金标门通过"
    : projectGateState === "closed"
      ? "工程金标门关闭"
      : projectGateState === "error"
        ? "工程金标门不可判定"
        : "工程金标门载入中";
  const operationFeedback = fileTransferError ?? message;

  return (
    <div
      className="page page--settings"
      aria-busy={settingsOperationBusy || projectGoldStatus === "loading" || ruleRegistryStatus === "loading"}
      data-release-family="legacy"
      data-schema-version="13"
      data-db-schema-version="13"
      data-evidence-authority="engineering-only"
      data-formal-validation-complete="false"
      data-scientific-validation-complete="false"
      data-mutation-mode="epoch-guarded"
      data-mutation-epoch-state={ruleRegistryMutationLocked ? "reconciliation_required" : "not_bypassed"}
      data-write-mode={ruleRegistryMutationLocked ? "reconciliation_required" : settingsOperationBusy ? "locked" : "available"}
      data-operation={activeSettingsOperation ?? (settingsBackgroundLoading ? "background_loading" : "idle")}
      data-prepared-file-state={preparedDelivery ? "prepared_not_delivered" : "none"}
      data-rule-registry-state={ruleRegistryStatus}
      data-project-gold-gate={projectGateState}
      data-release-identity={CURRENT_RELEASE_DATABASE.dbGeneration}
      data-target-schema={String(CURRENT_RELEASE_DATABASE.targetSchema)}
      data-migration-id={CURRENT_RELEASE_DATABASE.migrationId ?? "null"}
      data-engineering-evidence-only="true"
      data-mutation-epoch-bypassed="false"
      data-write-reconciliation-required={ruleRegistryMutationLocked ? "true" : "false"}
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-active-section={activeSettingsSection}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <PageHeading
        eyebrow="Local settings"
        title="设置与诊断"
        description="查看本地版本、计算边界与审核工具；完整备份、研究者资料、附件和删除操作集中在独立的数据管理页。"
        actions={<AppLink href="/help" className="secondary-action"><CircleHelp aria-hidden="true" />打开帮助与安全边界</AppLink>}
      />

      <section className="settings-command-deck" aria-labelledby="settings-command-title">
        <div className="settings-command-copy">
          <p className="eyebrow">Release control ledger</p>
          <h2 id="settings-command-title">本机研究环境总账</h2>
          <p>先核对发布身份、数据库代际和证据门，再进入具体设置。这里展示工程状态，不把本地构建、摘要一致或自动测试解释成专家真值。</p>
          <div className="settings-command-status" aria-label="当前工程门禁">
            <StatusPill tone={CURRENT_RELEASE_EVIDENCE_BOUND ? "info" : "warning"}>
              {CURRENT_RELEASE_EVIDENCE_BOUND ? "工程证据已绑定" : "工程证据未绑定"}
            </StatusPill>
            <StatusPill tone={projectGateState === "passed" ? "jade" : projectGateState === "error" ? "cinnabar" : projectGateState === "loading" ? "info" : "warning"}>
              {projectGateLabel}
            </StatusPill>
            <StatusPill tone={ruleRegistryMutationLocked ? "cinnabar" : "info"}>
              {ruleRegistryMutationLocked ? "规则写入待只读核对" : "本页无待核对写入"}
            </StatusPill>
            <StatusPill tone="warning">不代表公开授权</StatusPill>
          </div>
        </div>
        <dl className="settings-command-facts">
          <div><dt>发布身份</dt><dd>{CURRENT_RELEASE_DATABASE.dbGeneration}</dd></div>
          <div><dt>目标数据库</dt><dd>targetSchema {CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
          <div><dt>迁移任务</dt><dd>migrationId {CURRENT_RELEASE_DATABASE.migrationId ?? "null"}</dd></div>
          <div data-state={CURRENT_RELEASE_EVIDENCE_BOUND ? "bound" : "unbound"}><dt>工程证据</dt><dd>{CURRENT_RELEASE_EVIDENCE_BOUND ? CURRENT_RELEASE_EVIDENCE_ID : "未绑定"}</dd></div>
          <div data-state={projectGateState}><dt>项目金标</dt><dd>{projectGoldReport ? `${projectGoldReport.counts.verified} / ${projectGoldReport.requiredGoldCaseCount}` : projectGoldStatus === "error" ? "不可判定 · 门关闭" : "载入中 · 门关闭"}</dd></div>
          <div data-state="unauthorized"><dt>公开发布授权</dt><dd>未授予</dd></div>
        </dl>
        <nav className="settings-command-nav" aria-label="设置页面目录">
          <a href="#settings-data" aria-current={activeSettingsSection === "settings-data" ? "location" : undefined} onClick={() => setActiveSettingsSection("settings-data")}><span aria-hidden="true">01</span><strong>数据与备份</strong></a>
          <a href="#settings-audit-gold" aria-current={activeSettingsSection === "settings-audit-gold" ? "location" : undefined} onClick={() => setActiveSettingsSection("settings-audit-gold")}><span aria-hidden="true">02</span><strong>审核工具</strong></a>
          <a href="#settings-rule-packs" aria-current={activeSettingsSection === "settings-rule-packs" ? "location" : undefined} onClick={() => setActiveSettingsSection("settings-rule-packs")}><span aria-hidden="true">03</span><strong>规则包</strong></a>
          <a href="#settings-runtime" aria-current={activeSettingsSection === "settings-runtime" ? "location" : undefined} onClick={() => setActiveSettingsSection("settings-runtime")}><span aria-hidden="true">04</span><strong>运行边界</strong></a>
          <a href="#settings-diagnostic" aria-current={activeSettingsSection === "settings-diagnostic" ? "location" : undefined} onClick={() => setActiveSettingsSection("settings-diagnostic")}><span aria-hidden="true">05</span><strong>诊断与资源</strong></a>
        </nav>
        <div className="settings-operation-rail" data-state={settingsControlState} role="status" aria-live="polite" aria-atomic="true">
          <Activity aria-hidden="true" />
          <span><small>{ruleRegistryMutationLocked ? "MUTATION RECONCILIATION" : settingsBackgroundLoading ? "BACKGROUND READ STATUS" : "LOCAL OPERATION STATUS"}</small><strong>{activeSettingsOperation ? `正在执行：${activeSettingsOperation}` : ruleRegistryMutationLocked ? "规则包写入结果等待只读核对" : settingsBackgroundLoading ? "正在读取规则仓库与工程金标门" : "当前没有正在执行的本机操作"}</strong></span>
          <p>{settingsOperationBusy ? "当前控制面已锁定，完成或取消后自动恢复。" : ruleRegistryMutationLocked ? "同类 mutation 保持锁定；只读重读不会重复提交。" : settingsBackgroundLoading ? "后台只读状态仍在载入；依赖结果的入口各自保持关闭，其他本机工具可继续使用。" : "审核、规则、诊断与资源操作一次只执行一项。"}</p>
        </div>
      </section>

      <fieldset
        className="settings-grid settings-operation-surface"
        disabled={settingsOperationBusy}
        aria-label="设置与诊断操作区"
        aria-busy={settingsOperationBusy}
        onClickCapture={(event) => {
          if (!settingsOperationBusy || !(event.target instanceof Element) || !event.target.closest("a")) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <section className="settings-section settings-section--wide settings-data-entry" id="settings-data">
          <div className="settings-icon"><HardDrive aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Local data safety</p>
            <h2>数据管理与完整备份</h2>
            <p>集中查看十六个用户数据分区，编辑研究者资料与本机偏好，管理附件、规则包仓库、两类时间迁移凭证和 Revision 计算收据，并完成 ZIP/JSON 导出、写入前预检、安全快照和事务恢复。</p>
            <AppLink href="/settings/data" className="primary-action">打开数据管理</AppLink>
          </div>
        </section>

        <section className="settings-section settings-section--wide" id="settings-audit-gold">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Gold-standard audit</p>
            <h2>金标准候选审核</h2>
            <p>工程金标配额门按十二类固定配额逐案计数，不能把同一候选重复填入不同类别。现有 {FROZEN_JIE_BOUNDARY_EVIDENCE.total} 行节气边界数据均为回归候选，已验证 {FROZEN_JIE_BOUNDARY_EVIDENCE.verified} 行；审核包把候选输入、四柱期望和规则配置分别绑定到 SHA-256 摘要，并要求两个不同身份的复核记录。</p>
            {projectGoldReport ? (
              <div className="rule-pack-preview" role="status">
                <strong>{projectGoldReport.releaseGatePassed ? "360 例工程金标门已通过" : "360 例工程金标配额门仍关闭"}</strong>
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
            ) : <p role={projectGoldStatus === "error" ? "alert" : "status"}>{projectGoldStatus === "error" ? "项目级 360 配额登记表不可用；当前无法判定配额状态，发布门保持关闭。" : "正在载入项目级 360 配额登记表；载入完成前发布门保持关闭。"}</p>}
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
              <button type="button" className="secondary-action" onClick={() => runSettingsOperation("导出节气边界审核包", exportGoldReviewBundle)}><Download aria-hidden="true" />导出 36 行审核包</button>
              <button type="button" className="secondary-action" onClick={() => runSettingsOperation("预检节气边界裁决", chooseGoldDecision)}><Upload aria-hidden="true" />预检双人裁决记录</button>
            </div>
            <p>摘要只能证明内容未变化，不能证明复核人身份。裁决预检只检查格式、绑定和双人字段；必须线下核验来源并纳入版本化 fixture，才可计入发布金标。</p>
            {goldDecisionPreview ? <div className="rule-pack-preview" role="status"><strong>裁决记录预检通过，尚未计入金标</strong><dl><div><dt>候选</dt><dd>{goldDecisionPreview.candidate.id}</dd></div><div><dt>决定</dt><dd>{goldDecisionPreview.envelope.payload.decision}</dd></div><div><dt>复核人</dt><dd>{goldDecisionPreview.envelope.payload.attestations.map((item) => item.displayName).join("、")}</dd></div><div><dt>摘要</dt><dd>{goldDecisionPreview.envelope.digest}</dd></div></dl><p>{goldDecisionPreview.notice}</p></div> : null}
            {goldAuditError ? <div className="inline-error" role="alert"><strong>金标准审核未完成</strong><p>{goldAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide" id="settings-audit-transit">
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
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy} onClick={() => runSettingsOperation("导出运限查询审核包", exportTransitQueryReviewBundle)}><Download aria-hidden="true" />导出运限查询审核包</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy} onClick={() => runSettingsOperation("载入运限查询审核包", chooseTransitQueryReviewBundle)}><Upload aria-hidden="true" />载入运限审核包</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle} onClick={() => runSettingsOperation("预检运限独立审核 A", () => chooseTransitQueryIndependentReview("A"))}><Upload aria-hidden="true" />预检独立审核 A</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle} onClick={() => runSettingsOperation("预检运限独立审核 B", () => chooseTransitQueryIndependentReview("B"))}><Upload aria-hidden="true" />预检独立审核 B</button>
              <button type="button" className="secondary-action" disabled={transitQueryAuditBusy || !transitQueryReviewBundle || !transitQueryIndependentReviewA || !transitQueryIndependentReviewB} onClick={() => runSettingsOperation("预检运限最终裁决", chooseTransitQueryAdjudication)}><Upload aria-hidden="true" />预检运限最终裁决</button>
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
                  <div><dt>审核 A</dt><dd>{transitQueryIndependentReviewA ? `${safeVisibleText(transitQueryIndependentReviewA.payload.reviewer.reviewerId, "未记录审核人", 160)} · ${safeVisibleText(transitQueryIndependentReviewA.payload.verdict, "未记录结论", 120)}` : "尚未载入"}</dd></div>
                  <div><dt>审核 B</dt><dd>{transitQueryIndependentReviewB ? `${safeVisibleText(transitQueryIndependentReviewB.payload.reviewer.reviewerId, "未记录审核人", 160)} · ${safeVisibleText(transitQueryIndependentReviewB.payload.verdict, "未记录结论", 120)}` : "尚未载入"}</dd></div>
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
                  <div><dt>候选</dt><dd>{safeVisibleText(transitQueryAdjudicationPreview.candidate.id, "未记录候选", 160)}</dd></div>
                  <div><dt>决定</dt><dd>{safeVisibleText(transitQueryAdjudicationPreview.envelope.payload.decision, "未记录决定", 120)}</dd></div>
                  <div><dt>独立审核</dt><dd>{transitQueryAdjudicationPreview.independentReviews.map((review) => safeVisibleText(review.payload.reviewer.reviewerId, "未记录审核人", 160)).join("、")}</dd></div>
                  <div><dt>身份已验证</dt><dd>否</dd></div>
                  <div><dt>可自动写入 fixture</dt><dd>否</dd></div>
                  <div><dt>裁决摘要</dt><dd>{safeVisibleText(transitQueryAdjudicationPreview.envelope.digest, "摘要不可显示", 160)}</dd></div>
                </dl>
                <p>{safeVisibleText(transitQueryAdjudicationPreview.notice, "裁决说明不可显示。", 1000)}</p>
              </div>
            ) : null}
            {transitQueryAuditError ? <div className="inline-error" role="alert"><strong>运限查询审核未完成</strong><p>{transitQueryAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide" id="settings-audit-calendar">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Lunar conversion audit</p>
            <h2>农历转换候选审核</h2>
            <p>当前冻结 24 对香港天文台权威历表候选，对应农历转公历与公历转农历共 48 个方向断言；独立 .NET Framework 4.8 差分为 23 对匹配、1 对超出其支持下界、0 个分歧。它们仍全部是 candidate，人工 verified 为 0。</p>
            <p>裁决必须绑定复核人实际看到的审核包。先导出或载入审核包，再预检双人裁决；整个流程只读，不会自动写入 fixture 或提升金标计数。</p>
            <div className="backup-actions">
              <button type="button" className="secondary-action" disabled={calendarAuditBusy} onClick={() => runSettingsOperation("导出农历转换审核包", exportCalendarReviewBundle)}><Download aria-hidden="true" />导出 24 对农历审核包</button>
              <button type="button" className="secondary-action" disabled={calendarAuditBusy} onClick={() => runSettingsOperation("载入农历转换审核包", chooseCalendarReviewBundle)}><Upload aria-hidden="true" />载入审核包预检</button>
              <button type="button" className="secondary-action" disabled={calendarAuditBusy || !calendarReviewBundle} onClick={() => runSettingsOperation("预检农历转换裁决", chooseCalendarDecision)}><Upload aria-hidden="true" />预检农历双人裁决</button>
            </div>
            {calendarReviewBundle ? (
              <div className="rule-pack-preview" role="status">
                <strong>审核包已绑定到当前页面</strong>
                <dl>
                  <div><dt>候选</dt><dd>{calendarReviewBundle.payload.candidates.length} 对 / 48 方向</dd></div>
                  <div><dt>生成时间</dt><dd>{safeVisibleText(calendarReviewBundle.payload.generatedAt, "未知时间", 120)}</dd></div>
                  <div><dt>数据集摘要</dt><dd>{safeVisibleText(calendarReviewBundle.payload.dataset.datasetDigest, "摘要不可显示", 160)}</dd></div>
                  <div><dt>审核包摘要</dt><dd>{safeVisibleText(calendarReviewBundle.digest, "摘要不可显示", 160)}</dd></div>
                </dl>
                <p>SHA-256 不是身份签名；关闭或刷新页面后需重新载入该审核包。</p>
              </div>
            ) : null}
            {calendarDecisionPreview ? (
              <div className="rule-pack-preview" role="status">
                <strong>农历裁决预检通过，尚未写入、尚未计入金标</strong>
                <dl>
                  <div><dt>候选</dt><dd>{safeVisibleText(calendarDecisionPreview.candidate.id, "未记录候选", 160)}</dd></div>
                  <div><dt>日期对</dt><dd>{calendarDecisionPreview.effectiveExpected ? `${calendarDecisionPreview.effectiveExpected.lunarDate}${calendarDecisionPreview.effectiveExpected.lunarLeapMonth ? "（闰月）" : ""} → ${calendarDecisionPreview.effectiveExpected.gregorianDate}` : "拒绝候选，无生效日期对"}</dd></div>
                  <div><dt>决定</dt><dd>{safeVisibleText(calendarDecisionPreview.envelope.payload.decision, "未记录决定", 120)}</dd></div>
                  <div><dt>复核人</dt><dd>{calendarDecisionPreview.envelope.payload.attestations.map((item) => safeVisibleText(item.displayName, "未命名复核人", 120)).join("、")}</dd></div>
                  <div><dt>现实身份已核验</dt><dd>{calendarDecisionPreview.identityVerified ? "是" : "否"}</dd></div>
                  <div><dt>来源真实性已核验</dt><dd>{calendarDecisionPreview.sourceAuthenticityVerified ? "是" : "否"}</dd></div>
                  <div><dt>可进入维护者整合</dt><dd>{calendarDecisionPreview.eligibleForFixtureIntegration ? "是" : "否"}</dd></div>
                  <div><dt>裁决摘要</dt><dd>{safeVisibleText(calendarDecisionPreview.envelope.digest, "摘要不可显示", 160)}</dd></div>
                </dl>
                <p>{safeVisibleText(calendarDecisionPreview.notice, "裁决说明不可显示。", 1000)}</p>
              </div>
            ) : null}
            {calendarAuditError ? <div className="inline-error" role="alert"><strong>农历审核未完成</strong><p>{calendarAuditError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide" id="settings-rule-packs">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Declarative rule packs</p>
            <h2>规则包仓库与激活</h2>
            <p>只接受严格声明式 JSON；禁止可执行字段、原型污染键、URL 导入和未知字段。导入先进入本机隔离库，绝不自动激活。SHA-256 只能证明内容未变，包内“已审核”仍是作者自述；本机批准也不等于来源或顾问身份认证。</p>
            <p>当前真实应用版本为 <code>{APP_VERSION}</code>。预发布版低于同号正式版，例如 {APP_VERSION} 不会冒充已满足 0.2.0。</p>
            <div className="backup-actions"><button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => runSettingsOperation("导出内置规则包", exportDefaultRulePack)}><Download aria-hidden="true" />导出内置规则包</button><button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => runSettingsOperation("预检规则包", chooseRulePack)}><Upload aria-hidden="true" />选择规则包</button>{activeRulePack ? <button type="button" className="secondary-action" disabled={rulePackBusy || ruleRegistryMutationLocked || rulePackDeleteConfirmationOpen} onClick={() => runSettingsOperation("停用第三方规则包", deactivateInstalledRulePack)}>停用第三方包</button> : null}</div>
            {rulePackPreview ? <div className="rule-pack-preview" role="status"><strong>声明式完整性预检通过，可保存到隔离库</strong><dl><div><dt>标题</dt><dd>{safeVisibleText(rulePackPreview.envelope.metadata.title, "未命名规则包", 160)}</dd></div><div><dt>配置</dt><dd>{safeVisibleText(rulePackPreview.envelope.profile.profileId, "unknown-profile", 120)} {safeVisibleText(rulePackPreview.envelope.profile.profileVersion, "unknown-version", 80)}</dd></div><div><dt>包内审核自述</dt><dd>{safeVisibleText(rulePackPreview.envelope.metadata.review.status, "未声明", 120)}</dd></div><div><dt>包摘要</dt><dd>{safeVisibleText(rulePackPreview.digest, "摘要不可显示", 160)}</dd></div><div><dt>Profile 摘要</dt><dd>{safeVisibleText(rulePackPreview.profileDigest, "摘要不可显示", 160)}</dd></div><div><dt>当前可激活</dt><dd>{rulePackPreviewIssues.length === 0 ? "是" : "否；可保存研究"}</dd></div></dl>{rulePackPreviewIssues.length ? <ul className="warning-list">{rulePackPreviewIssues.map((issue) => <li key={issue}>{safeVisibleText(issue, "兼容性问题不可显示。", 600)}</li>)}</ul> : null}<button type="button" className="secondary-action" disabled={rulePackBusy || ruleRegistryStatus !== "ready" || ruleRegistryMutationLocked || rulePackDeleteConfirmationOpen} onClick={() => runSettingsOperation("保存规则包到隔离库", installRulePackPreview)}>保存到本机隔离库</button></div> : null}
            {ruleRegistryCommitIssue ? (
              <div className="rule-registry-commit-receipt" role="alert" aria-live="assertive">
                <div className="rule-registry-commit-receipt__heading">
                  <span>Mutation call made · exact outcome pending</span>
                  <strong>仓储调用已发出，精确提交状态尚未闭环</strong>
                </div>
                <p>不要重复执行同一写操作。当前页面已锁住规则包安装、激活、停用与删除，直到只读重读证明目标状态。</p>
                <dl>
                  <div><dt>待核对操作</dt><dd>{safeVisibleText(ruleRegistryCommitIssue.operationLabel, "未记录操作", 160)}</dd></div>
                  <div><dt>精确目标</dt><dd>{safeVisibleText(ruleRegistryCommitIssue.targetLabel, "未记录目标", 240)}</dd></div>
                  <div><dt>包摘要</dt><dd><code>{safeVisibleText(ruleRegistryCommitIssue.packDigest, "摘要不可显示", 160)}</code></dd></div>
                </dl>
                <p className="rule-registry-commit-receipt__detail">{safeVisibleText(ruleRegistryCommitIssue.detail, "提交核对信息不可显示。", 1000)}</p>
                <div className="backup-actions">
                  <button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => runSettingsOperation("只读核对规则包提交", recheckRuleRegistryCommitIssue)}>只读重读并核对</button>
                </div>
                <small>核对成功只证明本机仓库当前状态，不认证来源、作者、顾问身份或专家真值。</small>
              </div>
            ) : null}
            {ruleRegistryStatus === "loading" ? <div className="rule-registry-state is-loading" role="status"><div><strong>正在读取规则包仓库</strong><p>完成前不判断活动选择器或隔离库是否为空。</p></div></div> : null}
            {ruleRegistryStatus === "error" ? (
              <div className="rule-registry-state is-unavailable" role="alert">
                <div><p className="eyebrow">Registry unavailable</p><strong>规则包仓库暂不可用</strong><p>{ruleRegistryError ?? "无法读取规则包仓库。"}</p><small>未据此宣称当前使用内置默认，也未把仓库故障解释为空库。</small></div>
                <button type="button" className="secondary-action" onClick={() => runSettingsOperation("重新读取规则包仓库", () => refreshRuleRegistry().catch(() => undefined))}>重新读取规则包仓库</button>
              </div>
            ) : null}
            {ruleRegistryStatus === "ready" ? <>
              <div className="rule-pack-preview" role="status">
                <strong>{activeRulePack ? "已激活一个本机导入规则包" : "当前使用内置工作默认"}</strong>
                <p>{activeRulePack ? `活动包 ${safeVisibleText(activeRulePack.activeDigest, "摘要不可显示", 160)}；这是本机显式批准，不是身份认证。` : "没有第三方活动选择器；新排盘使用内置工作默认。"}</p>
              </div>
              {installedRulePacks.length ? <div className="rule-pack-library" aria-label="已安装规则包">
                {installedRulePacks.map((record) => {
                  const audit = installedRulePackAudits[record.packDigest];
                  const isActive = activeRulePack?.activeDigest === record.packDigest;
                  const deleteConfirmationOpen = rulePackDeleteDigest === record.packDigest;
                  return <article className="rule-pack-preview" key={record.packDigest}>
                    <strong>{safeVisibleText(audit?.title ?? `${record.packId}@${record.profileVersion}`, "未命名规则包", 160)}</strong>
                    <dl><div><dt>本机信任</dt><dd>导入未验证{isActive ? " · 本机已批准激活" : ""}</dd></div><div><dt>包内审核自述</dt><dd>{safeVisibleText(audit?.declaredReview, "读取失败", 160)}</dd></div><div><dt>Profile</dt><dd>{safeVisibleText(record.profileId, "unknown-profile", 120)} {safeVisibleText(record.profileVersion, "unknown-version", 80)}</dd></div><div><dt>摘要</dt><dd>{safeVisibleText(record.packDigest, "摘要不可显示", 160)}</dd></div><div><dt>引擎能力</dt><dd>{audit?.activatable ? "完整支持" : "不可激活"}</dd></div></dl>
                    {audit?.issues.length ? <ul className="warning-list">{audit.issues.map((issue) => <li key={issue}>{safeVisibleText(issue, "规则包问题不可显示。", 600)}</li>)}</ul> : null}
                    {!isActive ? <label className="lunar-leap-toggle"><input type="checkbox" disabled={ruleRegistryMutationLocked} checked={Boolean(rulePackAcknowledgements[record.packDigest])} onChange={(event) => setRulePackAcknowledgements((current) => ({ ...current, [record.packDigest]: event.target.checked }))} /><span><strong>我确认只在本机使用此精确摘要</strong><small>我理解包内审核是自述、本机批准不认证身份，且只影响后续新计算。</small></span></label> : null}
                    <div className="backup-actions">
                      <button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => runSettingsOperation(`导出规则包 ${record.packId}`, () => exportInstalledRulePack(record))}><Download aria-hidden="true" />导出</button>
                      {!isActive ? <button type="button" className="secondary-action" disabled={rulePackBusy || ruleRegistryMutationLocked || rulePackDeleteConfirmationOpen || !audit?.activatable || !rulePackAcknowledgements[record.packDigest]} onClick={() => runSettingsOperation(`激活规则包 ${record.packId}`, () => activateInstalledRulePack(record))}>按精确摘要激活</button> : null}
                      {!deleteConfirmationOpen ? <button type="button" className="danger-action" disabled={rulePackBusy || ruleRegistryMutationLocked || rulePackDeleteConfirmationOpen || isActive} onClick={() => setRulePackDeleteDigest(record.packDigest)}>删除</button> : null}
                    </div>
                    {deleteConfirmationOpen ? (
                      <div className="rule-pack-delete-confirm" role="group" aria-label={`确认删除规则包 ${safeVisibleText(record.packId, "unknown-pack", 120)}@${safeVisibleText(record.profileVersion, "unknown-version", 80)}`}>
                        <div><strong>永久删除此本机隔离包？</strong><small>只删除隔离库中的当前副本；历史修订摘要不会改写，完整备份中的副本不受影响。</small></div>
                        <code>{safeVisibleText(record.packDigest, "摘要不可显示", 160)}</code>
                        <div className="backup-actions">
                          <button type="button" className="danger-action" disabled={rulePackBusy || ruleRegistryMutationLocked} onClick={() => runSettingsOperation(`删除规则包 ${record.packId}`, () => deleteInstalledRulePack(record))}>确认删除精确摘要</button>
                          <button type="button" className="secondary-action" disabled={rulePackBusy} onClick={() => setRulePackDeleteDigest(null)}>取消</button>
                        </div>
                      </div>
                    ) : null}
                  </article>;
                })}
              </div> : <p>本机隔离库暂无导入规则包。</p>}
            </> : null}
            {rulePackError ? <div className="inline-error" role="alert"><strong>规则包操作未完成</strong><p>{rulePackError}</p></div> : null}
          </div>
        </section>

        <section className="settings-section settings-section--wide settings-section--runtime" id="settings-runtime">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">计算边界</p>
            <h2>传统子平工作默认</h2>
            <dl>
              <div><dt>应用版本</dt><dd>{APP_VERSION}</dd></div>
              <div><dt>应用壳 / SW 缓存代</dt><dd className="mono">{CURRENT_BUILD_VERSION ?? "开发模式"}</dd></div>
              <div><dt>发布证据包</dt><dd className="mono">{CURRENT_RELEASE_EVIDENCE_BOUND ? CURRENT_RELEASE_EVIDENCE_ID : "未绑定 · 仅本地构建"}</dd></div>
              <div><dt>数据库 generation</dt><dd className="mono">{CURRENT_RELEASE_DATABASE.dbGeneration}</dd></div>
              <div><dt>数据库名称</dt><dd className="mono">{CURRENT_RELEASE_DATABASE.databaseName}</dd></div>
              <div><dt>规则版本</dt><dd>{WORKING_DEFAULT_RULE_PROFILE.profileVersion}</dd></div>
              <div><dt>验证状态</dt><dd><StatusPill tone="warning">{WORKING_DEFAULT_RULE_PROFILE.status}</StatusPill></dd></div>
              <div><dt>引擎</dt><dd>{ENGINE.name} {ENGINE.version}</dd></div>
              <div><dt>上游</dt><dd>{ENGINE.upstreamName} {ENGINE.upstreamVersion}</dd></div>
              <div><dt>数据库 Schema</dt><dd>Dexie {CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
              <div><dt>迁移 ID</dt><dd className="mono">{CURRENT_RELEASE_DATABASE.migrationId ?? "null · 无迁移任务"}</dd></div>
              <div><dt>Manifest 摘要</dt><dd className="mono" title={CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST ?? undefined}>{CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST ?? "开发模式未注入"}</dd></div>
              <div><dt>页面写入状态</dt><dd>{document.documentElement.dataset.dbSourceWriteFrozen === "true" ? "只读冻结" : "按发布协议开放"}</dd></div>
              <div><dt>最近迁移阶段</dt><dd>{safeVisibleText(document.documentElement.dataset.dbMigrationPhase, "未报告", 120)}</dd></div>
              <div><dt>完整备份格式</dt><dd>{FULL_BACKUP_FORMAT_VERSION}</dd></div>
              <div><dt>时区数据库</dt><dd>IANA {RUNTIME_TIME_ZONE_DATABASE.ianaVersion} · 随应用锁定</dd></div>
              <div><dt>历史时区工件</dt><dd>{RETAINED_TZDB_LABEL} · 随当前应用构建保留</dd></div>
              <div><dt>tzdb 数据摘要</dt><dd className="mono" title={RUNTIME_TIME_ZONE_DATABASE.dataSha256}>{RUNTIME_TIME_ZONE_DATABASE.dataSha256}</dd></div>
              <div><dt>时区解析器</dt><dd>{RUNTIME_TIME_ZONE_DATABASE.resolver.name} {RUNTIME_TIME_ZONE_DATABASE.resolver.version}</dd></div>
            </dl>
            <div className="backup-actions">
              <button
                type="button"
                className="secondary-action"
                disabled={tzdbRegistryVerification.status === "verifying"}
                onClick={() => runSettingsOperation("检查历史时区数据", verifyRetainedTzdbArtifacts)}
              >
                <ShieldCheck aria-hidden="true" />加载并检查历史时区数据
              </button>
            </div>
            <p role="status">
              <StatusPill tone={tzdbRegistryVerification.status === "passed" ? "jade" : tzdbRegistryVerification.status === "failed" ? "cinnabar" : "info"}>
                {tzdbRegistryVerification.status === "passed" ? "历史复核可用" : tzdbRegistryVerification.status === "failed" ? "失败关闭" : tzdbRegistryVerification.status === "verifying" ? "正在验证" : "尚未验证"}
              </StatusPill>{" "}{safeVisibleText(tzdbRegistryVerification.message, "历史时区数据状态不可显示。", 900)}
            </p>
            <p>{WORKING_DEFAULT_RULE_PROFILE.notice}</p>
            <p>以上摘要只绑定工程构建、存储和测试证据；它不代表规则已经获得现实专家签字，也不授予第三方内容分发权。</p>
          </div>
        </section>

        <section className="settings-section settings-section--diagnostic" id="settings-diagnostic">
          <div className="settings-icon"><Download aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">诊断</p>
            <h2>准备不含命盘内容的诊断文件</h2>
            <p>包含应用、引擎、数据库名称、备份、tzdb 边界、规则包 ID/摘要、记录数量、浏览器标识与在线状态；不包含出生资料、案例别名或笔记，生成结果受 {formatBytes(SETTINGS_DIAGNOSTIC_BYTE_LIMIT)} 字节预算约束。</p>
            <aside className="settings-diagnostic-boundary" aria-label="诊断文件交付边界">
              <ShieldCheck aria-hidden="true" />
              <div><strong>无命盘正文，仍是敏感技术指纹</strong><p>文件先冻结再交付，只能下载或保存到可信位置；系统分享、专家真值声明和公开发布授权均保持关闭。</p></div>
              <div className="settings-diagnostic-boundary__facts" aria-label="诊断文件内容摘要"><span>不含案例正文</span><span>含浏览器标识</span><span>私密交付</span></div>
            </aside>
            <button type="button" className="secondary-action" onClick={() => runSettingsOperation("准备诊断 JSON", exportDiagnostic)}><Download aria-hidden="true" />准备诊断 JSON</button>
          </div>
        </section>

        <section className="settings-section" id="settings-expert-mode">
          <div className="settings-icon"><ShieldCheck aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">信息分层</p>
            <h2>标准模式与专家模式</h2>
            <p>标准模式使用短摘要和中文说明；专家模式展开原始 Revision/Case ID、完整哈希与复算元数据，便于核对导出工件。此设置只影响本机界面显示，不改变数据、备份或发布身份。</p>
            <label className="expert-mode-toggle">
              <input type="checkbox" checked={expertMode} onChange={(event) => setExpertMode(event.target.checked)} />
              <span><strong>专家模式：显示原始标识与完整摘要</strong><small>关闭后恢复标准短摘要视图。</small></span>
            </label>
          </div>
        </section>

        <section className="settings-section" id="settings-resources" aria-busy={resourceBusy}>
          <div className="settings-icon"><Download aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">本地资源</p>
            <h2>资源与性能报告</h2>
            <p>显示当前浏览器站点存储占用、可用的 JS 堆内存与本次页面会话内的主线程 long task。数据只在本机内存与界面中，不写入数据库、不进备份，也不会被远程收集。</p>
            <div className="backup-actions">
              <button type="button" className="secondary-action" disabled={resourceBusy} aria-busy={resourceBusy} onClick={() => runSettingsOperation("生成资源与性能报告", refreshResourceReport)}>
                {resourceBusy ? "正在收集…" : resourceReport ? "重新生成资源与性能报告" : "生成资源与性能报告"}
              </button>
            </div>
            {resourceBusy ? <p className="resource-report-status" role="status">正在生成新的本机快照；旧快照已撤下，不会与本次结果混用。</p> : null}
            {resourceError ? <div className="inline-error" role="alert"><strong>资源报告未完成</strong><p>{resourceError}</p></div> : null}
            {resourceReport ? (
              <dl className="metadata-list resource-report-grid">
                <div data-evidence-state="ready"><dt>检查时间<span className="resource-evidence-badge">快照</span></dt><dd>{formatDateTime(resourceReport.checkedAt)}</dd></div>
                <div data-evidence-state={storageEvidenceState(resourceReport.storage)}><dt>存储估算<span className="resource-evidence-badge">{resourceEvidenceLabel(storageEvidenceState(resourceReport.storage))}</span></dt><dd>{formatStorageEvidence(resourceReport.storage)}</dd></div>
                <div data-evidence-state={memoryEvidenceState(resourceReport.memory)}><dt>JS 堆内存<span className="resource-evidence-badge">{resourceEvidenceLabel(memoryEvidenceState(resourceReport.memory))}</span></dt><dd>{formatMemoryEvidence(resourceReport.memory)}</dd></div>
                <div data-evidence-state={longTaskSupported ? "ready" : "unavailable"}><dt>主线程 long task<span className="resource-evidence-badge">{longTaskSupported ? "可观测" : "不可用"}</span></dt><dd>{longTaskSupported
                  ? `${resourceReport.longTasks.count} 次 · 最长 ${resourceReport.longTasks.maxDurationMs === null ? "无" : `${resourceReport.longTasks.maxDurationMs.toFixed(1)} ms`} · 累计 ${resourceReport.longTasks.totalDurationMs.toFixed(1)} ms`
                  : "当前浏览器不支持 longtask 观测"}</dd></div>
                {resourceReport.longTasks.samples.length ? (
                  <div data-evidence-state="ready"><dt>最近样本<span className="resource-evidence-badge">最多 3 条</span></dt><dd>{resourceReport.longTasks.samples.slice(-3).map((sample) => `${sample.durationMs.toFixed(1)} ms${sample.attribution ? ` · ${safeVisibleText(sample.attribution, "未提供归因", 200)}` : ""}`).join("；")}</dd></div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </section>
      </fieldset>
      {operationFeedback ? (
        <aside className="settings-operation-feedback" data-tone={fileTransferError ? "error" : "info"} role={fileTransferError ? "alert" : "status"} aria-live={fileTransferError ? "assertive" : "polite"} aria-atomic="true">
          <div><p className="eyebrow">Local operation</p><strong>{fileTransferError ? "文件操作未完成" : "本机操作反馈"}</strong><p>{safeVisibleText(operationFeedback, "本机操作状态不可显示。", 1200)}</p></div>
          <button type="button" className="icon-button" aria-label="关闭操作反馈" onClick={() => { setFileTransferError(null); setMessage(null); }}><X aria-hidden="true" /></button>
        </aside>
      ) : null}
    </div>
  );
}
