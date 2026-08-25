import { FileDown, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { PairStructureResearchProjection } from "@hakimi/contracts";
import { type ReportExportPort, webReportExportPort } from "@hakimi/platform";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import "./pair-structure-report-export.css";

type PairExportAction = "anonymous" | "full";

type PreparedPairDelivery = {
  action: PairExportAction;
  artifact: PreparedFileArtifact;
};

type PairStructureReportExportProps = {
  projection: PairStructureResearchProjection;
  exportPort?: ReportExportPort;
};

const REIDENTIFICATION_COPY =
  "这是一份去标识副本，不是不可重识别的匿名数据。即使已移除案例别名、地点与研究文本，出生日期、出生时间和时区仍可能用于重新识别个人；文件还会保留性别、四柱与同步运限事实。";
const UNSAFE_PAIR_INLINE_TEXT_PATTERN = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const SENSITIVE_PAIR_ERROR_PATTERN = /(?:https?:\/\/|file:\/\/|[a-z]:\\|\/(?:users|home)\/|api[_-]?key|authorization|bearer\s|access[_-]?token|refresh[_-]?token|secret|password|stack\s*trace)/iu;
const MAX_PAIR_IDENTIFIER_CHARACTERS = 256;
const MAX_PAIR_ALIAS_CHARACTERS = 160;
const MAX_PAIR_OBSERVATIONS_PER_PARTICIPANT = 512;
const MAX_PAIR_EXPORT_BYTES = 16 * 1024 * 1024;
const WINDOWS_RESERVED_PAIR_FILENAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const UNSAFE_PAIR_FILENAME_PATTERN = /[<>:"/\\|?*]/u;

const PAIR_EXPORT_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
  "data-scientific-validity-claimed": "false",
  "data-system-share-allowed": "false",
  "data-network-transmission-performed": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-chart-or-storage-mutation-performed": "false",
  "data-relationship-conclusion": "null",
  "data-result": "null",
} as const;

type PairResearchExportModule = typeof import("@hakimi/research-export");
let pairResearchExportModulePromise: Promise<PairResearchExportModule> | null = null;

function loadPairResearchExportModule(): Promise<PairResearchExportModule> {
  if (!pairResearchExportModulePromise) {
    pairResearchExportModulePromise = import("@hakimi/research-export").catch((reason: unknown) => {
      pairResearchExportModulePromise = null;
      throw reason;
    });
  }
  return pairResearchExportModulePromise;
}

function preloadPairResearchExportModule(): void {
  void loadPairResearchExportModule().catch(() => undefined);
}

function pairRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function pairText(value: unknown, key: string): string {
  const record = pairRecord(value);
  const field = record?.[key];
  return typeof field === "string" ? field.trim() : "";
}

function isSafePairInlineText(value: unknown, maximumCharacters: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && Array.from(value).length <= maximumCharacters
    && !UNSAFE_PAIR_INLINE_TEXT_PATTERN.test(value);
}

function safePairErrorMessage(reason: unknown): string {
  const fallback = "双案例研究工件准备失败。";
  let message: string;
  try {
    if (!(reason instanceof Error)) return fallback;
    message = reason.message.trim();
  } catch {
    return fallback;
  }
  if (!isSafePairInlineText(message, 240) || SENSITIVE_PAIR_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

function shortPairIdentity(value: string): string {
  const characters = Array.from(value.trim());
  return characters.length > 22
    ? `${characters.slice(0, 10).join("")}…${characters.slice(-8).join("")}`
    : characters.join("");
}

function pairProjectionBindingIssue(value: PairStructureResearchProjection): string | null {
  const record = pairRecord(value);
  const manifest = pairRecord(record?.manifest);
  const resultHash = pairText(manifest, "resultHash");
  if (!/^[a-f0-9]{64}$/.test(resultHash)) return "投影摘要不是规范小写的 64 位十六进制 SHA-256";
  if (manifest?.resultHash !== resultHash) return "投影摘要包含非规范前后空白";
  if (record?.kind !== "pair_structure_research_projection") return "投影 kind 不是双案例结构研究工件";
  if (manifest?.semanticBoundary !== "participant_facts_only") return "投影没有绑定参与者事实层语义边界";
  if (manifest?.evidenceStatus !== "engineering_projection") return "投影没有绑定工程证据状态";

  const policy = pairRecord(record?.policy);
  if (
    policy?.mode !== "parallel_facts_only"
    || policy?.interpretationIncluded !== false
    || policy?.scoreIncluded !== false
    || policy?.crossChartDerivationIncluded !== false
    || policy?.relationshipConclusionIncluded !== false
  ) {
    return "投影政策未精确保持只并列事实、无解释、无评分、无跨盘推导和无关系结论";
  }

  const targetInstant = pairText(record, "targetInstant");
  if (
    record?.targetInstant !== targetInstant
    ||
    !/^\d{4}-\d{2}-\d{2}T.+Z$/i.test(targetInstant)
    || !Number.isFinite(Date.parse(targetInstant))
    || new Date(targetInstant).toISOString() !== targetInstant
  ) {
    return "共同目标不是规范化 UTC 瞬时点";
  }

  const participants = record?.participants;
  if (!Array.isArray(participants) || participants.length !== 2) return "双案例投影必须恰好绑定两位参与对象";
  const itemKeys: string[] = [];
  const caseIds: string[] = [];
  const revisionIds: string[] = [];
  for (let index = 0; index < participants.length; index += 1) {
    const expectedRole = index === 0 ? "A" : "B";
    const roleLabel = index === 0 ? "甲" : "乙";
    const participant = pairRecord(participants[index]);
    const item = pairRecord(participant?.item);
    const revision = pairRecord(item?.revision);
    const role = pairText(participant, "role");
    const slotId = pairText(item, "slotId");
    const itemKey = pairText(item, "key");
    const caseId = pairText(item, "caseId");
    const caseAlias = pairText(item, "caseAlias");
    const revisionCaseId = pairText(revision, "caseId");
    const revisionId = pairText(revision, "id");
    const revisionSnapshotDigest = pairText(item, "revisionSnapshotDigest");
    const revisionNumber = revision?.revisionNumber;
    if (role !== expectedRole || slotId !== expectedRole) return `对象${roleLabel}的 Role 或 Slot 与固定位置不一致`;
    if (
      participant?.role !== role
      || item?.slotId !== slotId
      || item?.key !== itemKey
      || item?.caseId !== caseId
      || item?.caseAlias !== caseAlias
      || revision?.caseId !== revisionCaseId
      || revision?.id !== revisionId
      || item?.revisionSnapshotDigest !== revisionSnapshotDigest
    ) {
      return `对象${roleLabel}的身份字段包含非规范前后空白`;
    }
    if (!isSafePairInlineText(itemKey, MAX_PAIR_IDENTIFIER_CHARACTERS)
      || !isSafePairInlineText(caseId, MAX_PAIR_IDENTIFIER_CHARACTERS)
      || !isSafePairInlineText(caseAlias, MAX_PAIR_ALIAS_CHARACTERS)
      || !isSafePairInlineText(revisionId, MAX_PAIR_IDENTIFIER_CHARACTERS)) {
      return `对象${roleLabel}缺少列键、Case、案例标签或 Revision ID，或相关身份不可安全显示`;
    }
    if (caseId !== revisionCaseId) return `对象${roleLabel}的 Case 与 Revision 归属不一致`;
    if (!/^[a-f0-9]{64}$/.test(revisionSnapshotDigest)) return `对象${roleLabel}的 Revision 记录摘要不是规范小写 SHA-256`;
    if (typeof revisionNumber !== "number" || !Number.isSafeInteger(revisionNumber) || revisionNumber <= 0) return `对象${roleLabel}包含无效 Revision 编号`;
    if (!Array.isArray(participant?.observations)) return `对象${roleLabel}的源投影事实不是可核对列表`;
    if (participant.observations.length > MAX_PAIR_OBSERVATIONS_PER_PARTICIPANT) {
      return `对象${roleLabel}的源投影事实超过 ${MAX_PAIR_OBSERVATIONS_PER_PARTICIPANT} 项安全处理上限`;
    }
    itemKeys.push(itemKey);
    caseIds.push(caseId);
    revisionIds.push(revisionId);
  }
  if (new Set(itemKeys).size !== itemKeys.length) return "对象甲与乙使用了重复列键";
  if (new Set(caseIds).size !== caseIds.length) return "对象甲与乙绑定了同一 Case，已拒绝伪造双案例工件";
  if (new Set(revisionIds).size !== revisionIds.length) return "对象甲与乙绑定了同一 Revision，已拒绝伪造双对象工件";
  return null;
}

function pairProjectionSourceKey(projection: PairStructureResearchProjection): string {
  return JSON.stringify([
    projection.manifest.resultHash,
    projection.targetInstant,
    projection.participants.map((participant) => [
      participant.role,
      participant.item.slotId,
      participant.item.key,
      participant.item.caseId,
      participant.item.caseAlias,
      participant.item.revision.id,
      participant.item.revisionSnapshotDigest
    ])
  ]);
}

function assertPairProjectionStillBound(
  projection: PairStructureResearchProjection,
  expectedSourceKey: string
): void {
  const issue = pairProjectionBindingIssue(projection);
  if (issue) throw new Error(`双案例投影在工件准备期间失去有效绑定：${issue}。`);
  if (pairProjectionSourceKey(projection) !== expectedSourceKey) {
    throw new Error("双案例投影在工件准备期间发生身份变化，已丢弃未交付内容。");
  }
}

function validatePairExportOutput(
  value: unknown,
  action: PairExportAction
): { blob: Blob; filename: string } {
  const output = pairRecord(value);
  const content = output?.content;
  const mimeType = output?.mimeType;
  const filename = output?.suggestedFileName;
  const expectedMediaType = action === "anonymous" ? "text/markdown" : "application/json";
  const expectedExtension = action === "anonymous" ? ".md" : ".json";
  if (typeof content !== "string" || !/\S/u.test(content)) {
    throw new Error("导出器返回了空工件内容，已拒绝进入交付窗口。");
  }
  if (content.length > MAX_PAIR_EXPORT_BYTES) {
    throw new Error(`导出工件文本超过 ${MAX_PAIR_EXPORT_BYTES} 个 UTF-16 代码单元，已在构造 Blob 前失败关闭。`);
  }
  if (!isSafePairInlineText(mimeType, 128)
    || mimeType.split(";", 1)[0]?.trim().toLowerCase() !== expectedMediaType) {
    throw new Error("导出器返回的媒体类型与所选报告格式不一致。");
  }
  if (!isSafePairInlineText(filename, 180)
    || filename !== filename.trim()
    || /[. ]$/u.test(filename)
    || UNSAFE_PAIR_FILENAME_PATTERN.test(filename)
    || WINDOWS_RESERVED_PAIR_FILENAME_PATTERN.test(filename)
    || !filename.toLowerCase().endsWith(expectedExtension)) {
    throw new Error("导出器返回了不安全或扩展名不匹配的文件名。");
  }
  const blob = new Blob([content], { type: mimeType });
  if (blob.size > MAX_PAIR_EXPORT_BYTES) {
    throw new Error(`导出工件为 ${blob.size} 字节，超过 ${MAX_PAIR_EXPORT_BYTES} 字节的本地交付上限。`);
  }
  return { blob, filename };
}

export function PairStructureReportExport({
  projection,
  exportPort = webReportExportPort
}: PairStructureReportExportProps) {
  const bindingIssue = pairProjectionBindingIssue(projection);
  const sourceKey = bindingIssue ? "invalid-pair-projection" : pairProjectionSourceKey(projection);
  const titleId = useId();
  const scopeId = useId();
  const anonymousTitleId = useId();
  const anonymousWarningId = useId();
  const fullWarningId = useId();
  const confirmationCopyId = useId();
  const [stateSourceKey, setStateSourceKey] = useState(sourceKey);
  const [activeAction, setActiveAction] = useState<PairExportAction | null>(null);
  const [fullAuditConfirmed, setFullAuditConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedPairDelivery | null>(null);
  const actionInFlightRef = useRef(false);
  const actionGenerationRef = useRef(0);
  const activeSourceKeyRef = useRef<string | null>(sourceKey);

  const sourceCurrent = stateSourceKey === sourceKey;
  const visibleActiveAction = sourceCurrent ? activeAction : null;
  const visibleFullAuditConfirmed = sourceCurrent && fullAuditConfirmed;
  const visibleError = sourceCurrent ? error : null;
  const visiblePreparedDelivery = sourceCurrent ? preparedDelivery : null;

  useLayoutEffect(() => {
    actionGenerationRef.current += 1;
    activeSourceKeyRef.current = sourceKey;
    actionInFlightRef.current = false;
    setStateSourceKey(sourceKey);
    setActiveAction(null);
    setFullAuditConfirmed(false);
    setError(null);
    setPreparedDelivery(null);
    return () => {
      actionGenerationRef.current += 1;
      activeSourceKeyRef.current = null;
      actionInFlightRef.current = false;
    };
  }, [sourceKey]);

  if (bindingIssue) {
    return (
      <section
        className="pair-research-export"
        data-binding-state="error"
        {...PAIR_EXPORT_SAFETY_ATTRIBUTES}
        aria-labelledby={titleId}
        aria-describedby={scopeId}
      >
        <header className="section-heading-row">
          <div><p className="eyebrow">PAIR ARTIFACT / 双案例工件</p><h2 id={titleId}>导出确切双案例研究工件</h2></div>
          <StatusPill tone="cinnabar">绑定失败关闭</StatusPill>
        </header>
        <div id={scopeId} className="pair-export-binding-error" role="alert">
          <strong>双案例导出投影未进入交付路径</strong>
          <p>{bindingIssue}。系统没有隐藏异常对象、补造共同瞬时点或生成近似文件。</p>
        </div>
      </section>
    );
  }

  const [participantA, participantB] = projection.participants;

  const run = async (
    action: PairExportAction,
    operation: (isCurrent: () => boolean) => Promise<void>
  ) => {
    if (actionInFlightRef.current) return;
    const operationSourceKey = sourceKey;
    const generation = ++actionGenerationRef.current;
    const isCurrent = () => (
      generation === actionGenerationRef.current &&
      operationSourceKey === activeSourceKeyRef.current
    );
    actionInFlightRef.current = true;
    setActiveAction(action);
    setError(null);
    try {
      await operation(isCurrent);
    } catch (reason) {
      if (isCurrent()) setError(safePairErrorMessage(reason));
    } finally {
      if (isCurrent()) {
        actionInFlightRef.current = false;
        setActiveAction(null);
      }
    }
  };

  const prepareAnonymous = () => run("anonymous", async (isCurrent) => {
    const { exportPairStructureAnonymousMarkdown } = await loadPairResearchExportModule();
    if (!isCurrent()) return;
    assertPairProjectionStillBound(projection, sourceKey);
    const output = await exportPairStructureAnonymousMarkdown(projection);
    if (!isCurrent()) return;
    assertPairProjectionStillBound(projection, sourceKey);
    const preparedOutput = validatePairExportOutput(output, "anonymous");
    setFullAuditConfirmed(false);
    setPreparedDelivery({
      action: "anonymous",
      artifact: {
        blob: preparedOutput.blob,
        filename: preparedOutput.filename,
        title: "去标识双案例 Markdown",
        sharePolicy: "blocked_sensitive",
        description: `这份去标识阅读副本已冻结在本机；下载和指定位置保存都会使用同一份内容，系统分享因重识别风险保持关闭。该文件不能替代完整审计 JSON。${REIDENTIFICATION_COPY}`
      }
    });
  });

  const prepareFullAudit = () => {
    if (!visibleFullAuditConfirmed) {
      setError("请先确认完整审计 JSON 的敏感资料范围。");
      return Promise.resolve();
    }
    return run("full", async (isCurrent) => {
      const { exportPairStructureFullAuditJson } = await loadPairResearchExportModule();
      if (!isCurrent()) return;
      assertPairProjectionStillBound(projection, sourceKey);
      const output = await exportPairStructureFullAuditJson(
        projection,
        { acknowledgedSensitiveData: true }
      );
      if (!isCurrent()) return;
      assertPairProjectionStillBound(projection, sourceKey);
      const preparedOutput = validatePairExportOutput(output, "full");
      setFullAuditConfirmed(false);
      setPreparedDelivery({
        action: "full",
        artifact: {
          blob: preparedOutput.blob,
          filename: preparedOutput.filename,
          title: "完整双案例审计 JSON",
          sharePolicy: "blocked_sensitive",
          description: "这份完整审计工件包含两位对象的可识别资料、确切 ID、规则快照、证据字段与完整运限轨道。文件已冻结；指定位置保存和下载会使用同一份内容，系统分享保持关闭。关闭交付窗口后，再次生成必须重新确认敏感资料范围。"
        }
      });
    });
  };

  const generationBusy = !sourceCurrent || visibleActiveAction !== null;
  const controlsLocked = generationBusy || visiblePreparedDelivery !== null;
  const exportStatus = !sourceCurrent
    ? { label: "正在切换冻结来源", tone: "info" as const }
    : visibleActiveAction === "anonymous"
      ? { label: "正在核对去标识报告", tone: "info" as const }
      : visibleActiveAction === "full"
        ? { label: "正在核对完整审计", tone: "info" as const }
          : visibleError
          ? { label: "导出失败关闭", tone: "cinnabar" as const }
          : visiblePreparedDelivery
            ? { label: visiblePreparedDelivery.action === "full" ? "敏感审计工件已冻结" : "去标识工件已冻结", tone: "warning" as const }
              : { label: "默认去标识 · 可重识别", tone: "warning" as const };
  const identityStepState = sourceCurrent ? "complete" : "working";
  const artifactStepState = !sourceCurrent || visibleActiveAction
    ? "working"
    : visibleError
      ? "error"
      : visiblePreparedDelivery
        ? "complete"
        : "pending";
  const deliveryStepState = visiblePreparedDelivery ? "available" : "pending";

  return (
    <>
      <section
        className="pair-research-export"
        data-active-action={visibleActiveAction ?? "idle"}
        data-full-audit-confirmed={visibleFullAuditConfirmed}
        data-projection-hash={projection.manifest.resultHash}
        data-binding-state="bound"
        data-delivery-open={visiblePreparedDelivery !== null}
        data-artifact-state={visiblePreparedDelivery ? "prepared-not-necessarily-saved" : "not-prepared"}
        {...PAIR_EXPORT_SAFETY_ATTRIBUTES}
        aria-labelledby={titleId}
        aria-describedby={scopeId}
        aria-busy={generationBusy}
      >
      <header className="section-heading-row">
        <div>
          <p className="eyebrow">PAIR ARTIFACT / 双案例工件</p>
          <h2 id={titleId}>导出确切双案例研究工件</h2>
        </div>
        <StatusPill tone={exportStatus.tone}>{exportStatus.label}</StatusPill>
      </header>
      <p id={scopeId} className="export-scope-note">
        <strong>绑定边界：</strong>两种文件都会在本机重新核对当前 A/B 确切 Revision、共同 UTC 瞬时点与投影摘要；摘要不是数字签名。文件只含两方各自事实，不含跨盘推导、关系结论、婚配判断、建议或评分。
      </p>

      <dl className="pair-export-identity" aria-label="当前双案例导出冻结身份">
        <div data-identity="participant-a"><dt>对象甲</dt><dd dir="auto">{participantA.item.caseAlias} · R{participantA.item.revision.revisionNumber}<code dir="auto" title={participantA.item.revision.id}>Revision {shortPairIdentity(participantA.item.revision.id)}</code></dd><small dir="auto" title={participantA.item.caseId}>Case {shortPairIdentity(participantA.item.caseId)} · {participantA.observations.length} 项源投影事实</small></div>
        <div data-identity="participant-b"><dt>对象乙</dt><dd dir="auto">{participantB.item.caseAlias} · R{participantB.item.revision.revisionNumber}<code dir="auto" title={participantB.item.revision.id}>Revision {shortPairIdentity(participantB.item.revision.id)}</code></dd><small dir="auto" title={participantB.item.caseId}>Case {shortPairIdentity(participantB.item.caseId)} · {participantB.observations.length} 项源投影事实</small></div>
        <div data-identity="target"><dt>共同 UTC</dt><dd dir="auto" title={projection.targetInstant}>{projection.targetInstant}</dd><small>两方运限使用同一瞬时点</small></div>
        <div data-identity="hash"><dt>投影摘要</dt><dd><code dir="auto" title={projection.manifest.resultHash}>{projection.manifest.resultHash.slice(0, 12)}…{projection.manifest.resultHash.slice(-8)}</code></dd><small>生成文件时由导出器重新验真完整投影</small></div>
      </dl>

      <aside className="pair-export-delivery-boundary" data-share-policy="blocked_sensitive" aria-label="双案例文件交付边界">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>先冻结，再由本机交付</strong>
          <p>两类文件都会先生成不可变工件；指定位置保存与下载使用同一份内容。系统分享关闭，生成文件不代表已经保存或获得对外发布许可。</p>
        </div>
        <span>legacy-v13 · Schema 13 · migration null · 未获公开授权</span>
      </aside>

      <ol className="pair-export-process" aria-label="双案例文件准备与交付流程">
        <li data-state={identityStepState}>
          <span>01 / IDENTITY</span>
          <strong>{sourceCurrent ? "冻结源身份已绑定" : "正在切换冻结来源"}</strong>
          <small>A/B Revision、共同 UTC 与投影摘要</small>
        </li>
        <li data-state={artifactStepState}>
          <span>02 / LOCAL BUILD</span>
          <strong>{visibleActiveAction ? "正在本机重新核对" : visibleError ? "工件生成失败关闭" : visiblePreparedDelivery ? "不可变工件已冻结" : "等待选择导出格式"}</strong>
          <small>生成仍不表示文件已经保存</small>
        </li>
        <li data-state={deliveryStepState}>
          <span>03 / DELIVERY</span>
          <strong>{visiblePreparedDelivery ? "本机交付窗口已打开" : "等待已冻结工件"}</strong>
          <small>保存、下载与发布授权分别判断</small>
        </li>
      </ol>

      {visibleError ? <div className="inline-error" role="alert"><strong>双案例工件未导出</strong><p>{visibleError}</p></div> : null}

      <article className="pair-export-anonymous" data-share-policy="blocked_sensitive" aria-labelledby={anonymousTitleId}>
        <div className="pair-export-card-heading">
          <FileDown aria-hidden="true" />
          <div>
            <h3 id={anonymousTitleId}>去标识双案例独立事实报告</h3>
            <p>仅用对象甲 / 乙与 R 号标识双方，保留通过白名单审查的对象甲 {participantA.observations.length} 项、对象乙 {participantB.observations.length} 项系统事实，以及各自六层活动节点。</p>
          </div>
        </div>
        <p className="privacy-warning" id={anonymousWarningId}>{REIDENTIFICATION_COPY}</p>
        <ul className="pair-export-scope-list">
          <li>移除别名、UUID、地点、坐标、来源备注、规则说明、用户文本、哈希和完整运限轨道。</li>
          <li>保留出生日期、时间、时区、性别、四柱与同一 UTC 下每一方自己的运限事实。</li>
        </ul>
        <div className="pair-export-actions">
          <button
            type="button"
            className="primary-action"
            data-format="anonymous-markdown"
            aria-describedby={anonymousWarningId}
            disabled={controlsLocked}
            aria-busy={visibleActiveAction === "anonymous"}
            onPointerEnter={preloadPairResearchExportModule}
            onFocus={preloadPairResearchExportModule}
            onClick={() => void prepareAnonymous()}
          >
            {visibleActiveAction === "anonymous" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
            {visibleActiveAction === "anonymous" ? "正在核对去标识报告" : "准备去标识双案例 Markdown"}
          </button>
        </div>
      </article>

      <details className="pair-export-sensitive" data-confirmed={visibleFullAuditConfirmed}>
        <summary>
          <span><TriangleAlert aria-hidden="true" />完整审计 JSON（敏感）</span>
          <StatusPill tone="warning">显式确认</StatusPill>
        </summary>
        <div className="pair-export-sensitive-body">
          <p id={fullWarningId}>
            完整文件会原样保存两位对象的别名、出生输入、地点、坐标、来源说明、确切 ID、规则快照、摘要、证据字段与完整运限轨道，用于复算和审计。
          </p>
          <label className="pair-export-confirmation">
            <input
              type="checkbox"
              checked={visibleFullAuditConfirmed}
              disabled={controlsLocked}
              aria-describedby={`${fullWarningId} ${confirmationCopyId}`}
              onChange={(event) => {
                setFullAuditConfirmed(event.target.checked);
                setError(null);
              }}
            />
            <span>
              <strong>我确认这是包含两位对象可识别资料的完整审计文件</strong>
              <small id={confirmationCopyId}>只会保存到可信位置，或交给已获明确授权的研究者。</small>
            </span>
          </label>
          <div className="pair-export-actions">
            <button
              type="button"
              className="secondary-action"
              data-format="full-audit-json"
              aria-describedby={`${fullWarningId} ${confirmationCopyId}`}
              disabled={controlsLocked || !visibleFullAuditConfirmed}
              aria-busy={visibleActiveAction === "full"}
              onPointerEnter={preloadPairResearchExportModule}
              onFocus={preloadPairResearchExportModule}
              onClick={() => void prepareFullAudit()}
            >
              {visibleActiveAction === "full" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
              {visibleActiveAction === "full" ? "正在核对完整审计" : "准备完整审计 JSON"}
            </button>
          </div>
        </div>
        </details>
      </section>

      {visiblePreparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={visiblePreparedDelivery.artifact}
          exportPort={exportPort}
          onClose={() => {
            if (sourceKey === activeSourceKeyRef.current) setPreparedDelivery(null);
          }}
        />
      ) : null}
    </>
  );
}
