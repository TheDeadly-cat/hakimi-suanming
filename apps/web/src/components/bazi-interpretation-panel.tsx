import { Download, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import { pickTextFile, webReportExportPort } from "@hakimi/platform";
import {
  BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME,
  BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE,
  BAZI_CONTENT_REVIEW_EXPORT_FILENAME,
  BAZI_CONTENT_REVIEW_QUEUE,
  BAZI_CURRENT_CHART_HIT_REVIEW_FILENAME,
  BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE,
  BAZI_STRENGTH_POLICY,
  buildBaziFirstReadReview,
  buildBaziThemeIndexReview,
  buildTenGodOccurrenceReview,
  buildTenGodOrientationReview,
  buildBaziPositionSynthesisReview,
  buildShenshaOccurrenceReview,
  buildStrengthSensitivityReview,
  buildTenGodStrengthSensitivityReview,
  createBaziContentReviewFeedbackTemplate,
  createBaziCurrentChartHitReviewTemplate,
  deriveShenshaResearchFacts,
  interpretBaziChart,
  preflightBaziContentReviewFeedback,
  preflightBaziCurrentChartHitReview,
  serializeBaziContentReviewFeedbackTemplate,
  serializeBaziCurrentChartHitReview,
  serializeBaziContentReviewQueue,
  type BaziContentReviewFeedbackPreflight,
  type BaziCurrentChartHitReviewEnvelope,
  type BaziCurrentChartHitReviewPreflight,
  type BaziInterpretationResult,
  type BaziContentReviewCategory,
  type BaziFirstReadReview,
  type BaziThemeIndexId,
  type BaziThemeIndexReview,
  type StrengthSensitivityReview,
  type TenGodOccurrenceReviewResult,
  type TenGodStrengthSensitivityReview
} from "@hakimi/bazi-interpretation";
import { shortHash } from "../lib/format";
import { AppLink } from "../lib/router";
import { BaziStrengthEvidenceLedgerPanel } from "./bazi-strength-evidence-ledger";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "./prepared-file-delivery-dialog";
import { StatusPill } from "./status-pill";
import "./bazi-interpretation-panel.css";

const unsafeInterpretationRenderTextPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const unsafeInterpretationSourceUrlPattern = /[\u0000-\u0020\u007F\u202A-\u202E\u2066-\u2069]/u;
const sensitiveInterpretationCredentialPattern = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|bearer|secret|password)\b(?:\s*[:=]\s*|\s+)[^\s,;]+/giu;
const visibleInterpretationUrlPattern = /\b(?:https?|file):\/\/[^\s"'<>]+/giu;
const localInterpretationWindowsPathPattern = /(?:[a-z]:\\|\\\\)[^\s"'<>]+/giu;
const localInterpretationUserPathPattern = /\/(?:users|home)\/[^\s"'<>]+/giu;
const interpretationStackTracePattern = /\bstack\s*trace\b.*$/iu;
const MAX_INTERPRETATION_INLINE_CHARACTERS = 220;
const MAX_INTERPRETATION_IDENTIFIER_CHARACTERS = 256;
const INTERPRETATION_COLLECTION_LIMITS = Object.freeze({
  pillars: 8,
  strengthFactors: 128,
  sensitivityScenarios: 128,
  tenGodSensitivityItems: 32,
  occurrenceItems: 256,
  firstReadSteps: 8,
  themeItems: 16,
  sources: 128
});

function interpretationCodePointLengthExceeds(value: string, maximumCharacters: number): boolean {
  let count = 0;
  for (const _character of value) {
    count += 1;
    if (count > maximumCharacters) return true;
  }
  return false;
}

function safeInterpretationInlineText(
  value: unknown,
  fallback: string,
  maximumCharacters = MAX_INTERPRETATION_INLINE_CHARACTERS
): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized
    || interpretationCodePointLengthExceeds(normalized, maximumCharacters)
    || unsafeInterpretationRenderTextPattern.test(normalized)) return fallback;
  return normalized;
}

function safeInterpretationErrorMessage(reason: unknown, fallback: string): string {
  if (!(reason instanceof Error)) return fallback;
  const message = safeInterpretationInlineText(reason.message, fallback);
  return message
    .replace(sensitiveInterpretationCredentialPattern, "[凭据已隐藏]")
    .replace(visibleInterpretationUrlPattern, "[链接已隐藏]")
    .replace(localInterpretationWindowsPathPattern, "[本地路径已隐藏]")
    .replace(localInterpretationUserPathPattern, "[本地路径已隐藏]")
    .replace(interpretationStackTracePattern, "[调用栈已隐藏]");
}

function isSafeInterpretationIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value === value.trim()
    && !/\s/u.test(value)
    && !interpretationCodePointLengthExceeds(value, MAX_INTERPRETATION_IDENTIFIER_CHARACTERS)
    && !unsafeInterpretationRenderTextPattern.test(value);
}

function safeInterpretationSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || unsafeInterpretationSourceUrlPattern.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function interpretationSourceHost(value: string): string {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function useBaziInterpretation(revision: RevisionRecord) {
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  return useMemo(
    () => interpretBaziChart(revision.facts, { includeHour }),
    [includeHour, revision.facts]
  );
}

type CurrentChartReviewOperation = "idle" | "preparing" | "exporting" | "choosing" | "validating";
type CurrentChartPacketState = "unprepared" | "bound" | "valid" | "invalid";

function currentChartReviewStatus(
  operation: CurrentChartReviewOperation,
  packetState: CurrentChartPacketState
): { tone: "neutral" | "warning" | "info" | "cinnabar"; label: string } {
  if (operation === "preparing") return { tone: "info", label: "正在准备" };
  if (operation === "exporting") return { tone: "info", label: "正在准备" };
  if (operation === "choosing") return { tone: "info", label: "等待选择" };
  if (operation === "validating") return { tone: "info", label: "正在预检" };
  if (packetState === "invalid") return { tone: "cinnabar", label: "反馈预检失败" };
  if (packetState === "valid") return { tone: "neutral", label: "结构预检通过" };
  if (packetState === "bound") return { tone: "warning", label: "模板已绑定" };
  return { tone: "neutral", label: "尚未准备" };
}

function BaziCurrentChartHitReviewPanel({
  revision,
  interpretation,
  strengthSensitivity,
  tenGodOccurrences
}: {
  revision: RevisionRecord;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
  tenGodOccurrences: TenGodOccurrenceReviewResult;
}) {
  const includeHour = includeReliableHour(revision);
  const bindingKey = JSON.stringify([
    revision.id,
    revision.manifest.resultHash,
    includeHour ? "hour" : "no-hour",
    interpretation.profile.rulePackId,
    interpretation.profile.ruleVersion,
    interpretation.profile.editorialVersion,
    strengthSensitivity.profile.projectionVersion,
    tenGodOccurrences.profile.projectionVersion
  ]);
  const bindingKeyRef = useRef(bindingKey);
  const epochRef = useRef(0);
  const operationTokenRef = useRef(0);
  const busyRef = useRef(false);
  const [operation, setOperation] = useState<CurrentChartReviewOperation>("idle");
  const [templateState, setTemplateState] = useState<{
    bindingKey: string;
    template: BaziCurrentChartHitReviewEnvelope;
  } | null>(null);
  const [preflightState, setPreflightState] = useState<{
    bindingKey: string;
    preflight: BaziCurrentChartHitReviewPreflight;
  } | null>(null);
  const [message, setMessage] = useState<{
    bindingKey: string;
    tone: "success" | "info" | "error";
    text: string;
    marksPreflightInvalid?: boolean;
  } | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);

  useEffect(() => {
    bindingKeyRef.current = bindingKey;
    epochRef.current += 1;
    operationTokenRef.current += 1;
    busyRef.current = false;
    setOperation("idle");
    setTemplateState(null);
    setPreflightState(null);
    setMessage(null);
    setPreparedDelivery(null);
  }, [bindingKey]);

  const template = templateState?.bindingKey === bindingKey ? templateState.template : null;
  const preflight = preflightState?.bindingKey === bindingKey ? preflightState.preflight : null;
  const currentMessage = message?.bindingKey === bindingKey ? message : null;
  const busy = operation !== "idle";
  const packetState: CurrentChartPacketState = template ? (preflight ? "valid" : currentMessage?.marksPreflightInvalid ? "invalid" : "bound") : "unprepared";
  const statusDisplay = currentChartReviewStatus(operation, packetState);
  const shenshaRuleHitCount = template
    ? new Set(template.packet.items
      .filter((item) => item.category === "shensha_occurrence")
      .map((item) => item.candidateSnapshot.ruleId)).size
    : 0;
  const packetBindingDigests = template ? [
    { label: "Facts projection", value: template.packet.bindings.factsProjectionSha256 },
    { label: "Strength policy", value: template.packet.bindings.strengthPolicySha256 },
    { label: "Strength assessment", value: template.packet.bindings.strengthAssessmentSha256 },
    { label: "Strength sensitivity", value: template.packet.bindings.strengthSensitivitySha256 },
    { label: "Evidence narrative", value: template.packet.bindings.strengthEvidenceNarrativeSha256 },
    { label: "Claim registry", value: template.packet.bindings.strengthClaimRegistrySha256 },
    { label: "Ordered review items", value: template.packet.bindings.orderedReviewItemIdsSha256 },
    { label: "Packet", value: template.packetSha256 }
  ] as const : [];

  const beginOperation = (next: CurrentChartReviewOperation) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation(next);
    return { token, epoch: epochRef.current, bindingKey };
  };

  const isCurrentOperation = (capture: { token: number; epoch: number; bindingKey: string }) => (
    operationTokenRef.current === capture.token
    && epochRef.current === capture.epoch
    && bindingKeyRef.current === capture.bindingKey
  );

  const finishOperation = (capture: { token: number; epoch: number; bindingKey: string }) => {
    if (!isCurrentOperation(capture)) return;
    busyRef.current = false;
    setOperation("idle");
  };

  const preparePacket = async () => {
    const capture = beginOperation("preparing");
    if (!capture) return;
    setTemplateState(null);
    setPreflightState(null);
    setMessage(null);
    try {
      const shensha = deriveShenshaResearchFacts(revision.facts, { includeHour });
      const shenshaOccurrences = buildShenshaOccurrenceReview(revision.facts, shensha);
      const buildInput = {
        facts: revision.facts,
        includeHour,
        interpretation,
        strengthSensitivity,
        tenGodOccurrences,
        shensha,
        shenshaOccurrences,
        shenshaGate: "explicit_research_preview_included"
      } as const;
      const prepared = await createBaziCurrentChartHitReviewTemplate(buildInput);
      const independentlyRebuilt = await createBaziCurrentChartHitReviewTemplate(buildInput);
      const generatedPreflight = await preflightBaziCurrentChartHitReview(
        serializeBaziCurrentChartHitReview(prepared),
        independentlyRebuilt
      );
      if (
        !generatedPreflight.currentChartBound
        || generatedPreflight.resolvedCount !== 0
        || generatedPreflight.unresolvedCount !== prepared.packet.counts.total
        || generatedPreflight.counts.total !== prepared.packet.counts.total
        || generatedPreflight.reviewerAttributionComplete
      ) {
        throw new Error("新生成的本盘复核模板未通过空白模板绑定校验，已拒绝进入页面状态。");
      }
      const verifiedTemplate = generatedPreflight.envelope;
      if (!isCurrentOperation(capture)) return;
      setTemplateState({ bindingKey, template: verifiedTemplate });
      setMessage({
        bindingKey,
        tone: "info",
        text: `本盘复核包已独立重建并完成序列化往返校验：${verifiedTemplate.packet.counts.total} 项；神煞研究由本次按钮显式触发。未写入命盘或数据库。`
      });
    } catch (reason) {
      if (!isCurrentOperation(capture)) return;
      setTemplateState(null);
      setMessage({
        bindingKey,
        tone: "error",
        text: safeInterpretationErrorMessage(reason, "无法准备当前盘命中复核包。")
      });
    } finally {
      finishOperation(capture);
    }
  };

  const preparePacketDelivery = () => {
    if (!template) return;
    const capture = beginOperation("exporting");
    if (!capture) return;
    setMessage(null);
    try {
      const content = serializeBaziCurrentChartHitReview(template);
      if (!isCurrentOperation(capture)) return;
      setPreparedDelivery({
        blob: new Blob([content], { type: "application/json;charset=utf-8" }),
        filename: BAZI_CURRENT_CHART_HIT_REVIEW_FILENAME,
        title: "当前盘命中复核包",
        description: "含当前盘四柱与派生命中事实，可形成命盘指纹；仅用于离线人工复核，不代表专家真值、正式内容或发布授权。",
        sharePolicy: "blocked_sensitive"
      });
      setMessage({
        bindingKey,
        tone: "info",
        text: "本盘反馈模板已在本机内存中准备；尚未保存或下载。请在交付对话框再次确认，文件含命盘指纹，SHA-256 不是加密。"
      });
    } catch (reason) {
      if (!isCurrentOperation(capture)) return;
      setMessage({
        bindingKey,
        tone: "error",
        text: safeInterpretationErrorMessage(reason, "无法准备当前盘命中复核包。")
      });
    } finally {
      finishOperation(capture);
    }
  };

  const chooseReviewFile = async () => {
    if (!template) return;
    const capture = beginOperation("choosing");
    if (!capture) return;
    setMessage(null);
    try {
      const file = await pickTextFile({
        accept: ".json,application/json",
        maxBytes: 2 * 1024 * 1024
      });
      if (!isCurrentOperation(capture)) return;
      if (!file) {
        setMessage({ bindingKey, tone: "info", text: "已取消选择；同一命盘的上一预检结果保持不变。" });
        return;
      }
      setPreflightState(null);
      setOperation("validating");
      const checked = await preflightBaziCurrentChartHitReview(file.text, template);
      if (!isCurrentOperation(capture)) return;
      setPreflightState({ bindingKey, preflight: checked });
      const selectedFileName = safeInterpretationInlineText(file.name, "所选 JSON 文件", 180);
      const reviewerLabel = checked.reviewerAttributionComplete
        ? `${safeInterpretationInlineText(checked.envelope.reviewer.displayName, "未命名审稿人", 80)}（${safeInterpretationInlineText(checked.envelope.reviewer.reviewerId, "未提供审稿人 ID", 128)}）`
        : "尚未填写审稿归属";
      setMessage({
        bindingKey,
        tone: "info",
        text: `当前盘只读结构预检通过：${selectedFileName} · 已裁决 ${checked.resolvedCount}/${checked.counts.total} · ${reviewerLabel}。这不核验身份、专家真值或内容正确性；未写入命盘或数据库。`
      });
    } catch (reason) {
      if (!isCurrentOperation(capture)) return;
      setPreflightState(null);
      setMessage({
        bindingKey,
        tone: "error",
        text: safeInterpretationErrorMessage(reason, "当前盘复核反馈预检失败。"),
        marksPreflightInvalid: true
      });
    } finally {
      finishOperation(capture);
    }
  };

  return (
    <section
      id="bazi-current-chart-review"
      className="bazi-current-chart-review-workbench"
      aria-labelledby="bazi-current-chart-review-title"
      data-packet-version={BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE.formatVersion}
      data-content-version={BAZI_CURRENT_CHART_HIT_REVIEW_PROFILE.contentVersion}
      data-strength-policy-version={BAZI_STRENGTH_POLICY.policyVersion}
      data-facts-sha256={template?.packet.bindings.factsProjectionSha256 ?? "null"}
      data-strength-policy-sha256={template?.packet.bindings.strengthPolicySha256 ?? "null"}
      data-strength-assessment-sha256={template?.packet.bindings.strengthAssessmentSha256 ?? "null"}
      data-strength-sensitivity-sha256={template?.packet.bindings.strengthSensitivitySha256 ?? "null"}
      data-strength-evidence-narrative-sha256={template?.packet.bindings.strengthEvidenceNarrativeSha256 ?? "null"}
      data-strength-claim-registry-sha256={template?.packet.bindings.strengthClaimRegistrySha256 ?? "null"}
      data-packet-sha256={template?.packetSha256 ?? "null"}
      data-ordered-item-ids-sha256={template?.packet.bindings.orderedReviewItemIdsSha256 ?? "null"}
      data-strength-question-count={template?.packet.counts.strengthMethod ?? 0}
      data-ten-god-occurrence-count={template?.packet.counts.tenGodOccurrences ?? 0}
      data-shensha-rule-hit-count={shenshaRuleHitCount}
      data-shensha-occurrence-count={template?.packet.counts.shenshaOccurrences ?? 0}
      data-total-count={template?.packet.counts.total ?? 0}
      data-binding-digest-count={packetBindingDigests.length}
      data-operation-state={operation}
      data-preflight-state={packetState}
      data-current-chart-bound={preflight?.currentChartBound ?? false}
      data-reviewer-attribution-complete={preflight?.reviewerAttributionComplete ?? false}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-formal-activation-allowed="false"
      data-auto-integration-allowed="false"
      data-catalog-decision-inheritance-applied="false"
      data-network-transmission-performed="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
      data-good-bad-orientation="null"
      data-event-outcome="null"
      data-result="null"
      aria-busy={busy}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}
      <header>
        <div>
          <small>Current chart hit review · v0.18</small>
          <h3 id="bazi-current-chart-review-title">本盘实际命中复核包</h3>
          <p>显式准备后，只收本盘 4 项旺衰方法、实际十神出现项与实际神煞落柱命中；不把全量 69 项目录的决定继承到本盘，也不把本盘意见反写成全局批准。</p>
        </div>
        <StatusPill tone={statusDisplay.tone}>{statusDisplay.label}</StatusPill>
      </header>

      <div className="bazi-current-chart-review-actions">
        <button type="button" className="secondary-action" disabled={busy} aria-busy={operation === "preparing"} onClick={() => void preparePacket()}>
          {operation === "preparing" ? "正在准备…" : template ? "重新准备当前盘包" : "准备当前盘复核包"}
        </button>
        <button type="button" className="secondary-action" disabled={busy || !template} aria-busy={operation === "exporting"} onClick={preparePacketDelivery}>
          <Download size={14} aria-hidden="true" />
          {operation === "exporting" ? "正在准备…" : "准备本盘反馈模板"}
        </button>
        <button type="button" className="secondary-action" disabled={busy || !template} aria-busy={operation === "choosing" || operation === "validating"} onClick={() => void chooseReviewFile()}>
          <Upload size={14} aria-hidden="true" />
          {operation === "choosing" || operation === "validating" ? "正在只读预检…" : "预检本盘反馈 JSON"}
        </button>
      </div>

      {template ? (
        <>
          <dl className="bazi-current-chart-review-summary" aria-label="本盘复核项目数量">
            <div><dt>旺衰方法</dt><dd>{template.packet.counts.strengthMethod}</dd></div>
            <div><dt>十神出现</dt><dd>{template.packet.counts.tenGodOccurrences}</dd></div>
            <div><dt>神煞规则命中</dt><dd>{shenshaRuleHitCount}</dd></div>
            <div><dt>神煞落柱出现</dt><dd>{template.packet.counts.shenshaOccurrences}</dd></div>
            <div><dt>本盘合计</dt><dd>{template.packet.counts.total}</dd></div>
          </dl>
          <dl className="bazi-current-chart-review-bindings" aria-label="本盘复核包绑定摘要">
            <div><dt>事实投影</dt><dd title={template.packet.bindings.factsProjectionSha256}>{shortHash(template.packet.bindings.factsProjectionSha256)}</dd></div>
            <div><dt>旺衰政策</dt><dd title={template.packet.bindings.strengthPolicySha256}>{shortHash(template.packet.bindings.strengthPolicySha256)}</dd></div>
            <div><dt>项目顺序</dt><dd title={template.packet.bindings.orderedReviewItemIdsSha256}>{shortHash(template.packet.bindings.orderedReviewItemIdsSha256)}</dd></div>
            <div><dt>复核包</dt><dd title={template.packetSha256}>{shortHash(template.packetSha256)}</dd></div>
            <div><dt>时柱范围</dt><dd>{includeHour ? "已纳入" : "已扣留"}</dd></div>
          </dl>
          <details className="bazi-current-chart-review-digests">
            <summary><span>完整复核包绑定</span><small>{packetBindingDigests.length} 项 SHA-256 · 可选择核对</small></summary>
            <dl aria-label="本盘复核包完整绑定摘要">
              {packetBindingDigests.map((digest) => (
                <div key={digest.label}><dt>{digest.label}</dt><dd><code>{digest.value}</code></dd></div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <p className="bazi-current-chart-review-empty" role={operation === "preparing" ? "status" : undefined}>
          {operation === "preparing"
            ? "正在内存中重新建立当前盘事实与复核包绑定；上一份模板已隐藏，完成前不会展示旧计数或摘要。"
            : "神煞仍默认关闭；点击“准备当前盘复核包”才会在内存中显式运行本次只读神煞研究并建立完整绑定。"}
        </p>
      )}

      {preflight ? (
        <div className="bazi-current-chart-review-result" role="group" aria-label="本盘反馈预检摘要">
          <strong>{preflight.resolvedCount} 已裁决 · {preflight.unresolvedCount} 未决</strong>
          <span>{preflight.reviewerAttributionComplete
            ? `${safeInterpretationInlineText(preflight.envelope.reviewer.displayName, "未命名审稿人", 80)} · ${safeInterpretationInlineText(preflight.envelope.reviewer.reviewerId, "未提供审稿人 ID", 128)}`
            : "未填写人工意见，可作为空白模板重新导出"}</span>
        </div>
      ) : null}
      {currentMessage ? <p className="bazi-current-chart-review-message" data-tone={currentMessage.tone} role={currentMessage.tone === "error" ? "alert" : "status"} aria-atomic="true">{currentMessage.text}</p> : null}

      <p className="bazi-current-chart-review-privacy">
        隐私提示：文件不含案例 ID、姓名、原始出生日期时间或地点，但含完整四柱和派生命中，可形成可关联的命盘指纹；不会自动上传，SHA-256 不是加密或签名。
      </p>
      <small className="bazi-current-chart-review-boundary">
        legacy-v13 · targetSchema 13 · migrationId null · policy {BAZI_STRENGTH_POLICY.policyVersion} · identity:false · signature:false · expert truth:false · scientific validity:false · formal activation:false · catalog inheritance:false · network:false · mutation:false · record write:false · good/bad:null · event:null · result:null
      </small>
    </section>
  );
}

function includeReliableHour(revision: RevisionRecord): boolean {
  return revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
}

function firstReadAvailabilityLabel(
  availability: BaziFirstReadReview["steps"][number]["availability"]
): string {
  if (availability === "available") return "可读";
  if (availability === "partial") return "部分可读";
  if (availability === "not_requested") return "待主动打开";
  return "未定";
}

function BaziFirstReadSteps({ review }: { review: BaziFirstReadReview }) {
  return (
    <ol className="bazi-first-read-steps" aria-label="八字整盘首读四步">
      {review.steps.map((step) => (
        <li
          key={step.contentId}
          data-step-id={step.id}
          data-order={step.order}
          data-availability={step.availability}
          data-selected-primary-theme="null"
          data-overall-good-bad="null"
          data-result="null"
        >
          <header>
            <div><small>0{step.order} · {step.eyebrow}</small><h3>{step.title}</h3></div>
            <StatusPill tone={step.availability === "not_requested" ? "warning" : "neutral"}>
              {firstReadAvailabilityLabel(step.availability)}
            </StatusPill>
          </header>
          <strong className="bazi-first-read-label">{step.label}</strong>
          <p>{step.directSummary}</p>
          {step.items.length ? <ul>{step.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          <small className="bazi-first-read-null-state">primary:null · overall:null · result:null</small>
        </li>
      ))}
    </ol>
  );
}

const themeFilterLabels: Readonly<Record<BaziThemeIndexId, string>> = Object.freeze({
  all: "全部",
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱",
  shensha: "神煞"
});

const interpretationJumpLinks = [
  { href: "#bazi-first-read-review", label: "首读" },
  { href: "#bazi-strength-ledger", label: "旺衰账" },
  { href: "#bazi-strength-sensitivity", label: "敏感性" },
  { href: "#bazi-ten-god-reading", label: "十神" },
  { href: "#bazi-shensha-gate", label: "神煞" },
  { href: "#bazi-current-chart-review", label: "本盘复核" },
  { href: "#bazi-content-review", label: "内容审稿" },
  { href: "#bazi-interpretation-evidence", label: "来源边界" }
] as const;

function BaziThemeIndex({ review }: { review: BaziThemeIndexReview }) {
  const [filter, setFilter] = useState<BaziThemeIndexId>("all");
  const visibleItems = filter === "all"
    ? review.items
    : review.items.filter((item) => item.id === filter);

  return (
    <nav
      className="bazi-theme-index"
      aria-labelledby="bazi-theme-index-title"
      data-theme-index-version={review.profile.projectionVersion}
      data-filter-policy={review.profile.filterPolicy}
      data-ordering-policy={review.profile.orderingPolicy}
      data-active-filter={filter}
      data-visible-theme-count={visibleItems.length}
      data-selected-primary-theme="null"
      data-expert-theme-verdict="null"
      data-ranking="null"
      data-overall-good-bad="null"
      data-result="null"
    >
      <header>
        <div>
          <small>Topic index · evidence drill-down</small>
          <h3 id="bazi-theme-index-title">按柱位钻取现有内容</h3>
          <p>{review.directSummary}</p>
        </div>
        <a className="bazi-theme-strength-link" href={`#${review.strengthAnchorId}`}>先看旺衰因素账</a>
      </header>
      <div className="bazi-theme-filters" aria-label="筛选八字内容入口">
        {review.filters.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {themeFilterLabels[id]}
          </button>
        ))}
      </div>
      <ol className="bazi-theme-index-list" aria-label="八字主题索引">
        {visibleItems.map((item) => (
          <li
            key={item.contentId}
            data-theme-id={item.id}
            data-order={item.order}
            data-availability={item.availability}
            data-occurrence-count={item.occurrenceCount}
            data-selected-primary-theme="null"
            data-rank="null"
            data-score="null"
            data-overall-good-bad="null"
            data-result="null"
          >
            <header>
              <div><small>0{item.order} · {item.eyebrow}</small><h4>{item.label}</h4></div>
              <StatusPill tone={item.availability === "not_requested" ? "warning" : "neutral"}>
                {firstReadAvailabilityLabel(item.availability)}
              </StatusPill>
            </header>
            <strong>{item.focus}</strong>
            {item.tenGods.length ? <p className="bazi-theme-ten-gods">{item.tenGods.join(" · ")}</p> : null}
            <p>{item.directSummary}</p>
            <a href={`#${item.anchorId}`}>{item.id === "shensha" ? "前往显式入口" : `查看${item.label}证据`}</a>
            <small>primary:null · rank:null · score:null · overall:null · result:null</small>
          </li>
        ))}
      </ol>
      <small className="bazi-theme-index-boundary">
        筛选只改变当前页面卡片可见性 · selected primary:null · expert verdict:null · ranking:null · overall:null · result:null
      </small>
    </nav>
  );
}

type ContentReviewOperation =
  | "idle"
  | "exporting_queue"
  | "exporting_feedback"
  | "choosing_feedback"
  | "validating_feedback";

function BaziContentReviewQueuePanel() {
  const operationRef = useRef<ContentReviewOperation>("idle");
  const [operation, setOperation] = useState<ContentReviewOperation>("idle");
  const [feedbackPreflight, setFeedbackPreflight] = useState<BaziContentReviewFeedbackPreflight | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<BaziContentReviewCategory>>(() => new Set());
  const [exportFeedback, setExportFeedback] = useState<{
    tone: "success" | "info" | "error";
    message: string;
  } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    tone: "success" | "info" | "error";
    message: string;
    marksPreflightInvalid?: boolean;
  } | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const itemsByCategory = useMemo(() => {
    const map = new Map<BaziContentReviewCategory, typeof BAZI_CONTENT_REVIEW_QUEUE.items>();
    for (const group of BAZI_CONTENT_REVIEW_QUEUE.groups) {
      map.set(
        group.category,
        BAZI_CONTENT_REVIEW_QUEUE.items.filter((item) => item.category === group.category)
      );
    }
    return map;
  }, []);
  const sourceById = useMemo(
    () => new Map(BAZI_CONTENT_REVIEW_QUEUE.sources.map((source) => [source.id, source] as const)),
    []
  );
  const busy = operation !== "idle";

  const beginOperation = (nextOperation: ContentReviewOperation): boolean => {
    if (operationRef.current !== "idle") return false;
    operationRef.current = nextOperation;
    setOperation(nextOperation);
    return true;
  };

  const transitionOperation = (nextOperation: ContentReviewOperation) => {
    operationRef.current = nextOperation;
    setOperation(nextOperation);
  };

  const finishOperation = () => {
    operationRef.current = "idle";
    setOperation("idle");
  };

  const prepareQueueDelivery = () => {
    if (!beginOperation("exporting_queue")) return;
    setExportFeedback(null);
    try {
      const content = serializeBaziContentReviewQueue(BAZI_CONTENT_REVIEW_QUEUE);
      setPreparedDelivery({
        blob: new Blob([content], { type: "application/json;charset=utf-8" }),
        filename: BAZI_CONTENT_REVIEW_EXPORT_FILENAME,
        title: "八字内容审稿清单",
        description: "69 项只读未裁决内容候选快照；不会写回命盘或数据库，也不代表专家真值、正式启用或发布授权。",
        sharePolicy: "blocked_sensitive"
      });
      setExportFeedback({
        tone: "info",
        message: "69 项审稿清单已在本机内存中准备；尚未保存或下载。请在交付对话框再次确认。"
      });
    } catch (reason) {
      setExportFeedback({
        tone: "error",
        message: safeInterpretationErrorMessage(reason, "无法准备八字内容审稿清单。")
      });
    } finally {
      finishOperation();
    }
  };

  const prepareFeedbackTemplateDelivery = async () => {
    if (!beginOperation("exporting_feedback")) return;
    setFeedbackMessage(null);
    try {
      const template = await createBaziContentReviewFeedbackTemplate();
      const content = serializeBaziContentReviewFeedbackTemplate(template);
      setPreparedDelivery({
        blob: new Blob([content], { type: "application/json;charset=utf-8" }),
        filename: BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME,
        title: "八字内容审稿反馈模板",
        description: "与 69 项候选快照及摘要绑定的空白人工反馈模板；离线填写后仍只允许本机结构预检，不核验审稿人身份或内容真值。",
        sharePolicy: "blocked_sensitive"
      });
      setFeedbackMessage({
        tone: "info",
        message: "审稿反馈模板已在本机内存中准备；尚未保存或下载。请在交付对话框再次确认，模板本身不会批准内容。"
      });
    } catch (reason) {
      setFeedbackMessage({
        tone: "error",
        message: safeInterpretationErrorMessage(reason, "无法准备八字内容审稿反馈模板。")
      });
    } finally {
      finishOperation();
    }
  };

  const chooseFeedbackFile = async () => {
    if (!beginOperation("choosing_feedback")) return;
    setFeedbackMessage(null);
    try {
      const file = await pickTextFile({
        accept: ".json,application/json",
        maxBytes: 2 * 1024 * 1024
      });
      if (!file) {
        setFeedbackMessage({ tone: "info", message: "已取消选择；当前预检结果没有变化。" });
        return;
      }
      setFeedbackPreflight(null);
      transitionOperation("validating_feedback");
      const preflight = await preflightBaziContentReviewFeedback(file.text);
      setFeedbackPreflight(preflight);
      const selectedFileName = safeInterpretationInlineText(file.name, "所选 JSON 文件", 180);
      const reviewerLabel = preflight.reviewerAttributionComplete
        ? `${safeInterpretationInlineText(preflight.envelope.reviewer.displayName, "未命名审稿人", 80)}（${safeInterpretationInlineText(preflight.envelope.reviewer.reviewerId, "未提供审稿人 ID", 128)}）`
        : "尚未填写审稿归属";
      setFeedbackMessage({
        tone: "info",
        message: `只读结构预检通过：${selectedFileName} · 已裁决 ${preflight.resolvedCount}/${BAZI_CONTENT_REVIEW_QUEUE.counts.total} · ${reviewerLabel}。这不核验身份、专家真值或内容正确性；未写入命盘或数据库。`
      });
    } catch (reason) {
      setFeedbackPreflight(null);
      setFeedbackMessage({
        tone: "error",
        message: safeInterpretationErrorMessage(reason, "八字内容审稿反馈预检失败。"),
        marksPreflightInvalid: true
      });
    } finally {
      finishOperation();
    }
  };

  const setCategoryOpen = (category: BaziContentReviewCategory, open: boolean) => {
    setOpenCategories((current) => {
      if (current.has(category) === open) return current;
      const next = new Set(current);
      if (open) next.add(category);
      else next.delete(category);
      return next;
    });
  };

  const feedbackPreflightState = operation === "validating_feedback"
    ? "validating"
    : feedbackPreflight
      ? "valid"
      : feedbackMessage?.marksPreflightInvalid ? "invalid" : "not_loaded";

  return (
    <section
      id="bazi-content-review"
      className="bazi-content-review-queue"
      aria-labelledby="bazi-content-review-title"
      data-review-queue-version={BAZI_CONTENT_REVIEW_QUEUE.profile.projectionVersion}
      data-workflow-mode={BAZI_CONTENT_REVIEW_QUEUE.profile.workflowMode}
      data-total-count={BAZI_CONTENT_REVIEW_QUEUE.counts.total}
      data-unresolved-count={BAZI_CONTENT_REVIEW_QUEUE.counts.unresolved}
      data-approved-count={BAZI_CONTENT_REVIEW_QUEUE.counts.approve}
      data-revised-count={BAZI_CONTENT_REVIEW_QUEUE.counts.revise}
      data-rejected-count={BAZI_CONTENT_REVIEW_QUEUE.counts.reject}
      data-operation-state={operation}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-expert-truth-claimed="false"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
      aria-busy={busy}
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}
      <header>
        <div>
          <small>Content governance · review export</small>
          <h3 id="bazi-content-review-title">内容质量审稿台</h3>
          <p>把旺衰方法、十神落柱、神煞取法与神煞落柱集中到同一份可追溯目录；先逐条审，再谈正式启用。</p>
        </div>
        <StatusPill tone="warning">{BAZI_CONTENT_REVIEW_QUEUE.counts.total} 项 · {BAZI_CONTENT_REVIEW_QUEUE.counts.unresolved} 未裁决</StatusPill>
      </header>

      <div className="bazi-content-review-actions">
        <p>允许的未来状态是批准、退修或驳回；当前没有任何审稿人、时间、理由或专家真值。</p>
        <button type="button" className="secondary-action" disabled={busy} aria-busy={operation === "exporting_queue"} onClick={prepareQueueDelivery}>
          {operation === "exporting_queue" ? "正在准备 JSON…" : `准备 ${BAZI_CONTENT_REVIEW_QUEUE.counts.total} 项审稿清单 JSON`}
        </button>
      </div>
      <p
        className="bazi-content-review-feedback"
        data-tone={exportFeedback?.tone ?? "idle"}
        role={exportFeedback?.tone === "error" ? "alert" : "status"}
        aria-live={exportFeedback?.tone === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {exportFeedback?.message ?? `固定文件名：${BAZI_CONTENT_REVIEW_EXPORT_FILENAME} · 只读本机准备`}
      </p>

      <section
        className="bazi-content-review-feedback-workbench"
        aria-labelledby="bazi-content-review-feedback-title"
        data-feedback-format={BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.formatVersion}
        data-workflow-mode={BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.workflowMode}
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-preflight-state={feedbackPreflightState}
        data-resolved-count={feedbackPreflight?.resolvedCount ?? 0}
        data-unresolved-count={feedbackPreflight?.unresolvedCount ?? BAZI_CONTENT_REVIEW_QUEUE.counts.total}
        data-reviewer-attribution-complete={String(feedbackPreflight?.reviewerAttributionComplete ?? false)}
        data-identity-verified="false"
        data-digital-signature-verified="false"
        data-eligible-for-formal-activation="false"
        data-auto-integration-allowed="false"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-chart-or-storage-mutation-performed="false"
        data-record-write-performed="false"
        data-result="null"
        data-operation-state={operation}
      >
        <header>
          <div>
            <small>Human review handoff · local preflight</small>
            <h4 id="bazi-content-review-feedback-title">审稿反馈工作包</h4>
            <p>导出自带 {BAZI_CONTENT_REVIEW_QUEUE.counts.total} 项候选快照与 SHA-256 绑定的空白模板；填写后只能在本机做结构与覆盖预检。</p>
          </div>
          <StatusPill tone="neutral">身份未核验 · 不自动整合</StatusPill>
        </header>
        <div className="bazi-content-review-feedback-actions">
          <button
            type="button"
            className="secondary-action"
            disabled={busy}
            aria-busy={operation === "exporting_feedback"}
            onClick={() => void prepareFeedbackTemplateDelivery()}
          >
            <Download aria-hidden="true" />准备 {BAZI_CONTENT_REVIEW_QUEUE.counts.total} 项反馈模板
          </button>
          <button
            type="button"
            className="secondary-action"
            disabled={busy}
            aria-busy={operation === "choosing_feedback" || operation === "validating_feedback"}
            onClick={() => void chooseFeedbackFile()}
          >
            <Upload aria-hidden="true" />预检已填写反馈 JSON
          </button>
        </div>
        {operation !== "idle" && operation !== "exporting_queue" ? (
          <p className="bazi-content-review-feedback-status" role="status">
            {operation === "exporting_feedback"
              ? "正在建立绑定反馈模板…"
              : operation === "choosing_feedback"
                ? "等待选择本地反馈 JSON…"
                : "正在执行模板绑定与只读预检…"}
          </p>
        ) : null}
        {feedbackMessage ? (
          <p
            className="bazi-content-review-feedback-status"
            data-tone={feedbackMessage.tone}
            role={feedbackMessage.tone === "error" ? "alert" : "status"}
          >
            {feedbackMessage.message}
          </p>
        ) : (
          <p className="bazi-content-review-feedback-status" data-tone="idle">
            固定文件名：{BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME}
          </p>
        )}
        <dl aria-label="八字内容审稿反馈预检状态">
          <div><dt>反馈格式</dt><dd>{BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.formatVersion}</dd></div>
          <div><dt>队列绑定</dt><dd>{feedbackPreflight ? `sha256:${feedbackPreflight.envelope.queueBinding.queueSha256}` : "等待载入"}</dd></div>
          <div><dt>逐项决定</dt><dd>{feedbackPreflight ? `${feedbackPreflight.resolvedCount} 已裁决 · ${feedbackPreflight.unresolvedCount} 未决` : `0 已裁决 · ${BAZI_CONTENT_REVIEW_QUEUE.counts.total} 未决`}</dd></div>
          <div><dt>审稿归属</dt><dd>{feedbackPreflight?.reviewerAttributionComplete
            ? `${safeInterpretationInlineText(feedbackPreflight.envelope.reviewer.displayName, "未命名审稿人", 80)} · ${safeInterpretationInlineText(feedbackPreflight.envelope.reviewer.reviewerId, "未提供审稿人 ID", 128)}`
            : "尚未完整填写"}</dd></div>
          <div><dt>身份 / 签名</dt><dd>未核验 / 无数字签名</dd></div>
          <div><dt>正式整合</dt><dd>禁止自动整合 · 需要线下核验与代码审查</dd></div>
        </dl>
        <p className="bazi-content-review-feedback-boundary">
          legacy-v13 · targetSchema 13 · migrationId null。即使 {BAZI_CONTENT_REVIEW_QUEUE.counts.total} 项全部填完，预检仍固定 identityVerified:false · digitalSignatureVerified:false · formal activation:false · auto integration:false · mutation:false · record write:false · result:null。
        </p>
      </section>

      <div className="bazi-content-review-summary" role="list" aria-label="八字内容审稿分类统计">
        {BAZI_CONTENT_REVIEW_QUEUE.groups.map((group) => (
          <article key={group.category} role="listitem" data-category={group.category}>
            <small>{group.itemCount} 项</small>
            <strong>{group.label}</strong>
            <p>{group.description}</p>
            <span>{group.unresolvedCount} 未裁决 · 0 已批准</span>
          </article>
        ))}
      </div>

      <div className="bazi-content-review-groups">
        {BAZI_CONTENT_REVIEW_QUEUE.groups.map((group) => {
          const items = itemsByCategory.get(group.category) ?? [];
          return (
            <details key={group.category} data-category={group.category} onToggle={(event) => setCategoryOpen(group.category, event.currentTarget.open)}>
              <summary>
                <span><strong>{group.label}</strong><small>{group.description}</small></span>
                <span>{group.itemCount} 项 · 未裁决</span>
              </summary>
              {openCategories.has(group.category) ? <ol aria-label={`${group.label}审稿项`}>
                {items.map((item) => (
                  <li
                    key={item.reviewItemId}
                    data-review-item-id={item.reviewItemId}
                    data-category={item.category}
                    data-decision={item.decision}
                    data-reviewer="null"
                    data-reviewed-at="null"
                    data-result="null"
                    data-expert-truth-claimed="false"
                    data-formal-activation-allowed="false"
                  >
                    <header>
                      <span><small>#{String(item.order).padStart(2, "0")}</small><strong>{item.title}</strong></span>
                      <em>未裁决</em>
                    </header>
                    <p>{item.candidateSummary}</p>
                    <p className="bazi-content-review-question"><strong>审稿问题</strong>{item.question}</p>
                    <details>
                      <summary>查看候选细节与来源</summary>
                      <ul>{item.candidateDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                      <div className="bazi-content-review-sources">
                        {item.sourceRefIds.map((sourceId) => {
                          const source = sourceById.get(sourceId);
                          if (!source) return <span key={sourceId}>来源引用缺失：{sourceId}</span>;
                           return safeInterpretationSourceUrl(source.url) ? (
                             <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${source.title}（在新窗口打开）`}>{source.title}</a>
                           ) : (
                             <span key={source.id}>{source.title} · 外链未开放</span>
                          );
                        })}
                      </div>
                    </details>
                    <small>decision:unresolved · reviewer:null · reviewedAt:null · result:null</small>
                  </li>
                ))}
              </ol> : null}
            </details>
          );
        })}
      </div>

      <ul className="bazi-content-review-boundaries">
        {BAZI_CONTENT_REVIEW_QUEUE.knownBoundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
      </ul>
    </section>
  );
}

function ShenshaResearchPreview({
  revision,
  interpretation,
  tenGodSensitivityReview
}: {
  revision: RevisionRecord;
  interpretation: BaziInterpretationResult;
  tenGodSensitivityReview: TenGodStrengthSensitivityReview;
}) {
  const includeHour = includeReliableHour(revision);
  const bindingKey = `${revision.id}:${revision.manifest.resultHash}:${includeHour ? "hour" : "no-hour"}`;
  const [expansion, setExpansion] = useState(() => ({ bindingKey, expanded: false }));
  const expanded = expansion.bindingKey === bindingKey && expansion.expanded;
  const preview = useMemo(
    () => {
      if (!expanded) return null;
      const shensha = deriveShenshaResearchFacts(revision.facts, { includeHour });
      return {
        shensha,
        occurrences: buildShenshaOccurrenceReview(revision.facts, shensha),
        synthesis: buildBaziPositionSynthesisReview(interpretation, shensha)
      };
    },
    [expanded, includeHour, interpretation, revision.facts]
  );
  const result = preview?.shensha ?? null;
  const occurrenceReview = preview?.occurrences ?? null;
  const safeShenshaSourceRefs = useMemo(
    () => (result?.sourceRefs ?? []).filter((source) => safeInterpretationSourceUrl(source.url)),
    [result]
  );
  const rejectedShenshaSourceCount = (result?.sourceRefs.length ?? 0) - safeShenshaSourceRefs.length;
  const synthesisByEditorialId = useMemo(
    () => new Map(
      (preview?.synthesis.items ?? []).map((item) => [item.shenshaPositionEditorialId, item] as const)
    ),
    [preview]
  );
  const tenGodSensitivityByName = useMemo(
    () => new Map(tenGodSensitivityReview.items.map((item) => [item.tenGod, item] as const)),
    [tenGodSensitivityReview]
  );

  return (
    <section
      id="bazi-shensha-gate"
      className="shensha-research-gate"
      aria-labelledby="shensha-research-title"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-expert-truth-claimed="false"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
    >
      <div className="shensha-research-intro">
        <div>
          <p className="eyebrow">Shensha fact registry</p>
          <h3 id="shensha-research-title">神煞事实研究预览</h3>
          <p>发布基线固定为 legacy-v13 / targetSchema 13 / migrationId null。当前修订的正式神煞层仍为{revision.ruleProfile.layers.shensha ? "开启" : "关闭"}；这里只在你主动展开后临时运行《三命通会》年柱基准候选，并显示 5×4 原创位置议题，不写入案例、不改变规则快照，也不自动解释吉凶。</p>
        </div>
        <div className="shensha-research-actions">
          <StatusPill tone="neutral">默认关闭 · 只读候选</StatusPill>
          <button
            type="button"
            className="secondary-action"
            aria-expanded={expanded}
            aria-controls="shensha-research-result"
            onClick={() => setExpansion((current) => ({
              bindingKey,
              expanded: current.bindingKey === bindingKey ? !current.expanded : true
            }))}
          >
            {expanded ? "收起研究预览" : "打开只读研究预览"}
          </button>
        </div>
      </div>

      {result ? (
        <div id="shensha-research-result" className="shensha-research-result">
          <dl className="shensha-research-summary">
            <div><dt>注册规则</dt><dd>{result.rules.length}</dd></div>
            <div><dt>本盘命中</dt><dd>{result.hits.length}</dd></div>
            <div><dt>位置候选</dt><dd>{result.positionEditorial.length} 条</dd></div>
            <div><dt>个案结论</dt><dd>result:null</dd></div>
          </dl>

          {occurrenceReview ? (
            <>
              <div className="shensha-pillar-heading">
                <div><small>Pillar-first hit index</small><h4>按四柱查看神煞命中</h4></div>
                <p>同一神煞落多柱会逐柱保留；数量只表示当前五条年干/年支候选的事实命中，不合并计分。</p>
              </div>
              <div className="shensha-pillar-grid" role="list" aria-label="四柱神煞候选命中">
                {occurrenceReview.pillars.map((pillar) => (
                  <article
                    key={pillar.position}
                    role="listitem"
                    className={pillar.availability === "uncertain_hour" ? "is-unavailable" : ""}
                    data-position={pillar.position}
                    data-occurrence-count={pillar.occurrenceCount}
                    data-availability={pillar.availability}
                    data-overall-good-bad="null"
                    data-result="null"
                  >
                    <header>
                      <div><small>{pillar.positionLabel}</small><strong>{pillar.ganZhi}</strong></div>
                      <StatusPill tone="neutral">
                        {pillar.availability === "uncertain_hour" ? "时柱关闭" : `${pillar.occurrenceCount} 项命中`}
                      </StatusPill>
                    </header>
                    {pillar.availability === "uncertain_hour" ? (
                      <p className="shensha-pillar-empty">时辰不可靠：本柱神煞出现项全部关闭。</p>
                    ) : pillar.items.length ? (
                      <ul aria-label={`${pillar.positionLabel}神煞出现项`}>
                        {pillar.items.map((item) => (
                          <li
                            key={item.contentId}
                            className="shensha-pillar-hit"
                            data-content-id={item.contentId}
                            data-rule-id={item.ruleId}
                            data-review-status={item.reviewStatus}
                            data-shensha-orientation="null"
                            data-overall-good-bad="null"
                            data-result="null"
                          >
                            <header><strong>{item.name}</strong><span>{item.matchedBranch}支命中</span></header>
                            <p className="shensha-pillar-summary">{item.directSummary}</p>
                            <p className="shensha-pillar-fact">{item.matchStatement}</p>
                            <details>
                              <summary>查看可用表达与复核条件</summary>
                              <dl>
                                <div><dt>表达可用时</dt><dd>{item.constructiveExpression}</dd></div>
                                <div><dt>需要复核</dt><dd>{item.tensionToReview}</dd></div>
                              </dl>
                              <p>合参门：{item.reviewPrompt}</p>
                              <small>{item.sourceLocator}</small>
                            </details>
                            <footer>
                              <small>{item.editorialId}</small>
                              <small>shensha:null · overall:null · result:null · 不评分</small>
                            </footer>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="shensha-pillar-empty">当前五条候选在本柱无命中；不表示不存在其他流派或其他神煞。</p>
                    )}
                    <small className="shensha-pillar-boundary">{pillar.doesNotEstablish}</small>
                  </article>
                ))}
              </div>
              <small className="shensha-occurrence-version">
                按柱投影 {occurrenceReview.profile.projectionVersion} · {occurrenceReview.occurrenceCount} 项 · formal-layer:false
              </small>
            </>
          ) : null}

          <div className="shensha-hit-heading">
            <div><small>Chart hit facts</small><h4>本盘神煞命中事实</h4></div>
            <p>先显示“以什么为基准、取什么支、落在哪一柱”；命中位置生成 {preview?.synthesis.items.length ?? 0} 个同柱复核包，十神方向会继承六场景敏感性降级，综合结果仍为 null。</p>
          </div>
          {result.hits.length ? (
            <ul className="shensha-hit-list" aria-label="本盘神煞候选命中">
              {result.hits.map((hit) => (
                <li key={hit.ruleId}>
                  <header><strong>{hit.name}</strong><span>{hit.positionLabels.join(" · ")}</span></header>
                  <p>{hit.factSummary}</p>
                  <small>{hit.sourceLocator}</small>
                  <p className="shensha-withheld">事实层仍为 interpretation:null；以下只给位置议题候选，个案取向、评分与吉凶继续关闭。</p>
                  <div className="shensha-position-candidate-list" role="list" aria-label={`${hit.name}位置议题候选`}>
                    {hit.positionEditorialCandidates.map((candidate) => {
                      const synthesis = synthesisByEditorialId.get(candidate.contentId);
                      const directionSensitivity = synthesis?.tenGod
                        ? tenGodSensitivityByName.get(synthesis.tenGod)
                        : null;
                      const effectiveDirection = directionSensitivity?.effectiveBalanceDirection
                        ?? synthesis?.tenGodBalanceDirection;
                      return (
                        <article
                          key={candidate.contentId}
                          role="listitem"
                          className="shensha-position-candidate"
                          data-content-id={candidate.contentId}
                          data-review-status={candidate.reviewStatus}
                          data-result="null"
                        >
                          <header>
                            <div><small>{candidate.positionLabel}</small><h5>{candidate.name}落{candidate.positionLabel} · 位置议题候选</h5></div>
                            <StatusPill tone="warning">待专家复核</StatusPill>
                          </header>
                          <p className="shensha-position-summary">{candidate.directSummary}</p>
                          <dl>
                            <div><dt>表达可用时</dt><dd>{candidate.constructiveExpression}</dd></div>
                            <div><dt>需要复核</dt><dd>{candidate.tensionToReview}</dd></div>
                          </dl>
                          <p className="shensha-position-review">合参门：{candidate.reviewPrompt}</p>
                          <small>{candidate.contentId} · result:null · 不评分</small>
                          {synthesis ? (
                            <section
                              className="bazi-position-synthesis-review"
                              aria-label={`${candidate.positionLabel}${candidate.name}同柱合参复核包`}
                              data-content-id={synthesis.contentId}
                              data-review-status={synthesis.reviewStatus}
                              data-ten-god-orientation={synthesis.tenGodOrientation}
                              data-ten-god-baseline-balance-direction={synthesis.tenGodBalanceDirection}
                              data-ten-god-balance-direction={effectiveDirection}
                              data-ten-god-direction-stability={directionSensitivity?.stability ?? "insufficient"}
                              data-shensha-orientation="null"
                              data-overall-result="null"
                            >
                              <header>
                                <div>
                                  <small>Same-pillar review</small>
                                  <strong>{synthesis.tenGod ?? "未映射十神"} × {synthesis.shenshaName}</strong>
                                </div>
                                <StatusPill tone="neutral">
                                  {directionSensitivity?.effectiveBalanceDirectionLabel ?? synthesis.tenGodBalanceDirectionLabel}
                                </StatusPill>
                              </header>
                              <p>{synthesis.directSummary}</p>
                              {directionSensitivity ? (
                                <p className="ten-god-sensitivity-link">{directionSensitivity.directSummary}</p>
                              ) : null}
                              <dl>
                                <div><dt>旺衰候选</dt><dd>{synthesis.strengthLabel}</dd></div>
                                <div><dt>十神位置</dt><dd>{synthesis.tenGodPositionSummary}</dd></div>
                              </dl>
                              <details>
                                <summary>查看 3 个同柱复核问题</summary>
                                <ol>{synthesis.reviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
                              </details>
                              <small>{synthesis.contentId} · overall:null · shensha:null · 不评分</small>
                            </section>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="shensha-empty">按当前五项、年柱基准候选，本盘没有命中；这不表示不存在其他流派或其他神煞。</p>}

          <details className="known-gaps shensha-registry-details">
            <summary>查看五项取法、冲突槽位和来源</summary>
            <ul className="shensha-rule-list">
              {result.rules.map((rule) => (
                <li key={rule.id}>
                  <strong>{rule.name}</strong>
                  <p>{rule.formulaSummary}</p>
                  <small>主基准：{rule.basisLabel} · 待审冲突：{rule.conflicts.map((item) => item.basis === "day_branch" ? "日支" : "日干").join("、")}（不执行）</small>
                </li>
              ))}
            </ul>
            <ul className="interpretation-source-list">
              {safeShenshaSourceRefs.map((source) => (
                <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${source.title}（在新窗口打开）`}>{source.title}</a><span>{source.usage}</span></li>
              ))}
              {rejectedShenshaSourceCount ? <li data-source-state="rejected" role="alert">已拒绝显示 {rejectedShenshaSourceCount} 条非安全 HTTPS、带凭据或含控制字符的神煞来源地址。</li> : null}
            </ul>
            <ul>{result.knownGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
          </details>
        </div>
      ) : null}
    </section>
  );
}

export function BaziInterpretationSummary({ revision }: { revision: RevisionRecord }) {
  const result = useBaziInterpretation(revision);
  const firstRead = useMemo(
    () => buildBaziFirstReadReview(revision.facts, result),
    [result, revision.facts]
  );
  return (
    <section
      className="interpretation-entry-summary"
      aria-labelledby="interpretation-entry-title"
      data-first-read-version={firstRead.profile.projectionVersion}
      data-selected-primary-theme="null"
      data-overall-good-bad="null"
      data-result="null"
      data-expert-truth-claimed="false"
      data-public-release-authorized="false"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
    >
      <div className="interpretation-entry-heading">
        <p className="eyebrow">Interpretation candidate generated</p>
        <h2 id="interpretation-entry-title">本盘工程解读候选已生成，尚未裁决</h2>
        <p>{firstRead.directSummary}</p>
      </div>
      <BaziFirstReadSteps review={firstRead} />
      <div className="interpretation-entry-action">
        <StatusPill tone="warning">固定顺序 · 非主题排名 · 待专家复核</StatusPill>
        <AppLink href={`/cases/${revision.caseId}/revisions/${revision.id}?view=overview`} className="secondary-action">打开完整工程候选与研究预览</AppLink>
      </div>
    </section>
  );
}

export function BaziInterpretationPanel({ revision }: { revision: RevisionRecord }) {
  const result = useBaziInterpretation(revision);
  const sensitivityReview = useMemo(() => buildStrengthSensitivityReview(result), [result]);
  const tenGodSensitivityReview = useMemo(
    () => buildTenGodStrengthSensitivityReview(result, sensitivityReview),
    [result, sensitivityReview]
  );
  const orientationReview = useMemo(() => buildTenGodOrientationReview(result), [result]);
  const occurrenceReview = useMemo(
    () => buildTenGodOccurrenceReview(revision.facts, result),
    [result, revision.facts]
  );
  const firstRead = useMemo(
    () => buildBaziFirstReadReview(
      revision.facts,
      result,
      sensitivityReview,
      tenGodSensitivityReview,
      occurrenceReview
    ),
    [occurrenceReview, result, revision.facts, sensitivityReview, tenGodSensitivityReview]
  );
  const themeIndex = useMemo(
    () => buildBaziThemeIndexReview(
      revision.facts,
      result,
      occurrenceReview,
      tenGodSensitivityReview
    ),
    [occurrenceReview, result, revision.facts, tenGodSensitivityReview]
  );
  const orientationByPosition = useMemo(
    () => new Map(orientationReview.items.map((item) => [item.position, item] as const)),
    [orientationReview]
  );
  const occurrencesByPosition = useMemo(
    () => new Map(occurrenceReview.pillars.map((pillar) => [pillar.position, pillar] as const)),
    [occurrenceReview]
  );
  const tenGodSensitivityByName = useMemo(
    () => new Map(tenGodSensitivityReview.items.map((item) => [item.tenGod, item] as const)),
    [tenGodSensitivityReview]
  );
  const supportFactors = result.strength.factors.filter((factor) => factor.direction === "support");
  const demandFactors = result.strength.factors.filter((factor) => factor.direction === "demand");
  const includeHour = includeReliableHour(revision);
  const strengthEvidenceBindingKey = JSON.stringify([
    revision.id,
    revision.manifest.resultHash,
    includeHour ? "hour" : "no-hour"
  ]);
  const interpretationBindingIssue = useMemo(() => {
    const projectionCollectionSizes = [
      [result.pillars.length, INTERPRETATION_COLLECTION_LIMITS.pillars],
      [result.strength.factors.length, INTERPRETATION_COLLECTION_LIMITS.strengthFactors],
      [sensitivityReview.scenarios.length, INTERPRETATION_COLLECTION_LIMITS.sensitivityScenarios],
      [tenGodSensitivityReview.items.length, INTERPRETATION_COLLECTION_LIMITS.tenGodSensitivityItems],
      [occurrenceReview.occurrenceCount, INTERPRETATION_COLLECTION_LIMITS.occurrenceItems],
      [firstRead.steps.length, INTERPRETATION_COLLECTION_LIMITS.firstReadSteps],
      [themeIndex.items.length, INTERPRETATION_COLLECTION_LIMITS.themeItems],
      [result.sourceRefs.length, INTERPRETATION_COLLECTION_LIMITS.sources]
    ] as const;
    if (projectionCollectionSizes.some(([size, maximum]) => !Number.isSafeInteger(size) || size < 0 || size > maximum)) {
      return "解读投影超过当前安全展示规模。";
    }
    const pillarPositions = result.pillars.map((reading) => reading.position);
    const orientationPositions = orientationReview.items.map((item) => item.position);
    const occurrencePositions = occurrenceReview.pillars.map((pillar) => pillar.position);
    if (new Set(pillarPositions).size !== pillarPositions.length) return "解读结果包含重复四柱位置。";
    if (new Set(orientationPositions).size !== orientationPositions.length) return "十神方向投影包含重复四柱位置。";
    if (new Set(occurrencePositions).size !== occurrencePositions.length) return "十神出现项投影包含重复四柱位置。";
    if (
      orientationPositions.length !== pillarPositions.length
      || occurrencePositions.length !== pillarPositions.length
      || pillarPositions.some((position) => !orientationByPosition.has(position) || !occurrencesByPosition.has(position))
    ) {
      return "四柱解读、十神方向与全柱出现项没有形成一一绑定。";
    }
    const factorIds = result.strength.factors.map((factor) => factor.id);
    if (new Set(factorIds).size !== factorIds.length) return "旺衰因素账包含重复稳定 ID。";
    const scenarioIds = sensitivityReview.scenarios.map((scenario) => scenario.id);
    if (new Set(scenarioIds).size !== scenarioIds.length) return "旺衰敏感性场景包含重复稳定 ID。";
    const sensitivityContentIds = tenGodSensitivityReview.items.map((item) => item.contentId);
    const sensitivityTenGods = tenGodSensitivityReview.items.map((item) => item.tenGod);
    if (
      new Set(sensitivityContentIds).size !== sensitivityContentIds.length
      || new Set(sensitivityTenGods).size !== sensitivityTenGods.length
    ) {
      return "十神敏感性传播层包含重复内容 ID 或十神键。";
    }
    const sourceIds = result.sourceRefs.map((source) => source.id);
    if (new Set(sourceIds).size !== sourceIds.length) return "解读来源登记包含重复来源 ID。";
    const projectionIdentifiers = [
      ...pillarPositions,
      ...orientationPositions,
      ...occurrencePositions,
      ...factorIds,
      ...scenarioIds,
      ...sensitivityContentIds,
      ...sourceIds,
      result.profile.rulePackId,
      result.profile.ruleVersion,
      result.profile.editorialVersion,
      sensitivityReview.profile.projectionVersion,
      tenGodSensitivityReview.profile.projectionVersion,
      firstRead.profile.projectionVersion,
      themeIndex.profile.projectionVersion
    ];
    if (projectionIdentifiers.some((identifier) => !isSafeInterpretationIdentifier(identifier))) {
      return "解读投影包含空白、超长或不可安全显示的稳定标识符。";
    }
    return null;
  }, [
    firstRead,
    occurrenceReview,
    occurrencesByPosition,
    orientationByPosition,
    orientationReview,
    result,
    sensitivityReview,
    themeIndex,
    tenGodSensitivityReview
  ]);
  const safeInterpretationSources = useMemo(
    () => result.sourceRefs.filter((source) => safeInterpretationSourceUrl(source.url)),
    [result.sourceRefs]
  );
  const rejectedInterpretationSourceCount = result.sourceRefs.length - safeInterpretationSources.length;

  if (interpretationBindingIssue) {
    return (
      <section
        className="flat-section bazi-interpretation-panel"
        aria-labelledby="bazi-interpretation-title"
        data-projection-state="invalid"
        data-schema-family="legacy-v13"
        data-release-family="legacy-v13"
        data-release-identity="legacy-v13"
        data-db-generation="13"
        data-target-schema="13"
        data-migration-id="null"
        data-engineering-evidence-only="true"
        data-mutation-epoch-bypassed="false"
        data-mutation-mode="read-only-no-mutation"
        data-chart-or-storage-mutation-performed="false"
        data-record-write-performed="false"
        data-expert-truth-claimed="false"
        data-public-release-authorized="false"
      >
        <div className="section-heading-row">
          <div><p className="eyebrow">Interpretation projection blocked</p><h2 id="bazi-interpretation-title">旺衰与十神候选已关闭</h2></div>
          <StatusPill tone="cinnabar">投影绑定异常</StatusPill>
        </div>
        <div className="bazi-interpretation-binding-error" role="alert">
          <strong>主解读没有形成可核对的一一绑定</strong>
          <p>{interpretationBindingIssue} 系统没有静默省略四柱卡、覆盖重复稳定键或继续展示局部结论。</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="flat-section bazi-interpretation-panel"
      aria-labelledby="bazi-interpretation-title"
      data-projection-state="bound"
      data-schema-family="legacy-v13"
      data-release-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="read-only-no-mutation"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
      data-expert-truth-claimed="false"
      data-public-release-authorized="false"
    >
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Interpretation candidate</p>
          <h2 id="bazi-interpretation-title">旺衰与十神解读</h2>
        </div>
        <StatusPill tone="warning">规则候选 · 待专家复核</StatusPill>
      </div>
      <p className="section-help">先给当前工程候选，再公开月令、透干与藏干的因素账。特殊格局、合化、调候和运限尚未纳入最终裁决。</p>
      <div className="bazi-interpretation-boundary-rail" role="note" aria-label="八字解读工程边界">
        <span>legacy-v13 · Schema 13</span>
        <span>工程候选</span>
        <span>只读投影</span>
        <p>一一绑定与结构预检只证明当前页面能追到对应工程输入，不证明内容正确、专家采信、科学有效或已获公开发布授权。</p>
      </div>
      <nav className="bazi-interpretation-jump-nav" aria-label="八字工程候选页内导航">
        {interpretationJumpLinks.map((link, index) => (
          <a key={link.href} href={link.href}><span>{String(index + 1).padStart(2, "0")}</span>{link.label}</a>
        ))}
      </nav>

      <section
        id="bazi-first-read-review"
        className="bazi-first-read-review"
        aria-labelledby="bazi-first-read-title"
        data-first-read-version={firstRead.profile.projectionVersion}
        data-order-policy={firstRead.profile.orderPolicy}
        data-selected-primary-theme="null"
        data-expert-first-read-verdict="null"
        data-overall-good-bad="null"
        data-result="null"
      >
        <header>
          <div><small>First read navigation</small><h3 id="bazi-first-read-title">整盘首读：先看哪四件事</h3></div>
          <StatusPill tone="neutral">固定顺序 · 不排名</StatusPill>
        </header>
        <p>{firstRead.directSummary}</p>
        <BaziFirstReadSteps review={firstRead} />
        <small className="bazi-first-read-review-boundary">
          selected primary:null · expert verdict:null · overall:null · result:null · 只读导航
        </small>
      </section>

      <BaziThemeIndex review={themeIndex} />

      <div id="bazi-strength-ledger" className="strength-verdict">
        <div className="strength-verdict-copy">
          <small>日主旺衰候选</small>
          <h3>{result.strength.dayMaster.stem}{result.strength.dayMaster.elementLabel} · {result.strength.label}</h3>
          <p>{result.strength.directSummary}</p>
        </div>
        <dl className="strength-ledger-summary">
          <div><dt>支持侧</dt><dd>{result.strength.supportWeight}</dd></div>
          <div><dt>泄耗克侧</dt><dd>{result.strength.demandWeight}</dd></div>
          <div><dt>规则</dt><dd>{result.profile.ruleVersion}</dd></div>
        </dl>
        <small className="strength-ledger-boundary">两侧数字是当前规则包的工程计权，不是概率、准确率、现实强度测量或专家裁决。</small>
      </div>

      <div className="strength-factor-columns">
        <section aria-labelledby="strength-support-title">
          <h3 id="strength-support-title">偏助因素</h3>
          {supportFactors.length ? (
            <ul>{supportFactors.map((factor) => (
              <li key={factor.id}>
                <div><strong>{factor.label}</strong><span>工程权重 {factor.weight}</span></div>
                <p>{factor.tenGod} · {factor.detail}</p>
              </li>
            ))}</ul>
          ) : <p className="empty-strength-side">本规则没有识别到印比支持因素。</p>}
        </section>
        <section aria-labelledby="strength-demand-title">
          <h3 id="strength-demand-title">泄耗克因素</h3>
          {demandFactors.length ? (
            <ul>{demandFactors.map((factor) => (
              <li key={factor.id}>
                <div><strong>{factor.label}</strong><span>工程权重 {factor.weight}</span></div>
                <p>{factor.tenGod} · {factor.detail}</p>
              </li>
            ))}</ul>
          ) : <p className="empty-strength-side">本规则没有识别到泄、耗、克因素。</p>}
        </section>
      </div>

      <BaziStrengthEvidenceLedgerPanel
        key={strengthEvidenceBindingKey}
        facts={revision.facts}
        includeHour={includeHour}
        interpretation={result}
        strengthSensitivity={sensitivityReview}
        bindingKey={strengthEvidenceBindingKey}
      />

      <details
        id="bazi-strength-sensitivity"
        className="strength-sensitivity-review"
        data-stability={sensitivityReview.stability}
        data-projection-version={sensitivityReview.profile.projectionVersion}
        data-baseline-rule-pack-id={sensitivityReview.baselineRulePackId}
        data-baseline-rule-version={sensitivityReview.baselineRuleVersion}
        data-scenario-count={sensitivityReview.scenarios.length}
        data-expert-verdict="null"
        data-selected-official-scenario="null"
        data-overall-good-bad="null"
      >
        <summary>
          <span><small>Engineering sensitivity audit</small><strong>查看旺衰判定敏感性</strong></span>
          <StatusPill tone={sensitivityReview.stability === "stable_across_engineering_scenarios" ? "neutral" : "warning"}>
            {sensitivityReview.stabilityLabel}
          </StatusPill>
        </summary>
        <div className="strength-sensitivity-body">
          <p className="strength-sensitivity-direct">{sensitivityReview.directSummary}</p>
          <div className="strength-duplicate-diagnostic" data-duplicate-detected={sensitivityReview.duplicateMonthMain.detected}>
            <strong>{sensitivityReview.duplicateMonthMain.detected ? "月令主气重复计权已检出" : "未检出月令主气重复项"}</strong>
            <span>{sensitivityReview.duplicateMonthMain.directSummary}</span>
          </div>
          <div className="strength-scenario-grid" role="list" aria-label="旺衰工程敏感性场景">
            {sensitivityReview.scenarios.map((scenario) => {
              const baselineComparison = scenario.role === "current_candidate_baseline"
                ? "baseline"
                : !scenario.agreesWithBaselineBand && !scenario.agreesWithBaselineDirection
                  ? "band_and_direction_changed"
                  : !scenario.agreesWithBaselineDirection
                    ? "direction_changed"
                    : !scenario.agreesWithBaselineBand
                      ? "band_changed"
                      : "matched";
              return (
                <article
                  key={scenario.id}
                  role="listitem"
                  data-scenario-id={scenario.id}
                  data-strength-band={scenario.band}
                  data-role={scenario.role}
                  data-baseline-comparison={baselineComparison}
                  data-agrees-with-baseline-band={scenario.agreesWithBaselineBand}
                  data-agrees-with-baseline-direction={scenario.agreesWithBaselineDirection}
                  data-official-rule-candidate="false"
                  data-overall-good-bad="null"
                >
                  <header>
                    <div>
                      <small>{scenario.role === "current_candidate_baseline" ? "当前比较基线" : "仅敏感性场景"}</small>
                      <h4>{scenario.label}</h4>
                    </div>
                    <StatusPill tone={baselineComparison.includes("changed") ? "warning" : "neutral"}>{scenario.bandLabel}</StatusPill>
                  </header>
                  <dl>
                    <div><dt>支持侧</dt><dd>{scenario.supportWeight}</dd></div>
                    <div><dt>泄耗克侧</dt><dd>{scenario.demandWeight}</dd></div>
                    <div><dt>规则权重占比</dt><dd>{scenario.supportRatio === null ? "—" : `${(scenario.supportRatio * 100).toFixed(1)}%`}</dd></div>
                  </dl>
                  <p className="strength-scenario-comparison" data-comparison={baselineComparison}>
                    {baselineComparison === "baseline"
                      ? "当前候选基线"
                      : baselineComparison === "band_and_direction_changed"
                        ? "分档与支持／泄耗方向均变化"
                        : baselineComparison === "direction_changed"
                          ? "支持／泄耗方向变化"
                          : baselineComparison === "band_changed"
                            ? "分档变化"
                            : "与基线同档同向"}
                  </p>
                  <p>{scenario.purpose}</p>
                  <footer>
                    <small>纳入 {scenario.includedFactorIds.length} · 排除 {scenario.excludedFactorIds.length}</small>
                    <small>正式规则候选:false · overall:null</small>
                  </footer>
                </article>
              );
            })}
          </div>
          <section className="ten-god-sensitivity-matrix" aria-labelledby="ten-god-sensitivity-title">
            <header>
              <div>
                <small>Downstream propagation</small>
                <h4 id="ten-god-sensitivity-title">十神方向随 {sensitivityReview.scenarios.length} 个场景如何变化</h4>
              </div>
              <StatusPill tone="neutral">
                分歧 {tenGodSensitivityReview.sensitiveTenGodCount} · 一致 {tenGodSensitivityReview.stableTenGodCount}
              </StatusPill>
            </header>
            <p>基线仍保留作审计；只要替代场景发生方向分歧，主卡、全柱出现项与同柱合参统一显示“条件性”。</p>
            <ul role="list" aria-label="本盘十神方向敏感性">
              {tenGodSensitivityReview.items.map((item) => (
                <li
                  key={item.contentId}
                  role="listitem"
                  data-ten-god={item.tenGod}
                  data-baseline-balance-direction={item.baselineBalanceDirection}
                  data-effective-balance-direction={item.effectiveBalanceDirection}
                  data-direction-stability={item.stability}
                  data-selected-official-scenario="null"
                  data-overall-good-bad="null"
                >
                  <strong>{item.tenGod}</strong>
                  <span>{item.baselineBalanceDirectionLabel.replace("平衡方向：", "基线：")} → {item.effectiveBalanceDirectionLabel}</span>
                  <small>{item.stabilityLabel} · {item.scenarios.length} 场景 · expert:null</small>
                </li>
              ))}
            </ul>
            <small className="strength-sensitivity-null-state">
              selected official:null · expert orientation:null · overall:null · result:null · 只读投影
            </small>
          </section>
          <section className="strength-expert-review-questions" aria-labelledby="strength-expert-review-title">
            <div>
              <small>Expert review queue</small>
              <h4 id="strength-expert-review-title">需要命理专家裁决的 {sensitivityReview.expertReviewQuestions.length} 个问题</h4>
            </div>
            <ol>{sensitivityReview.expertReviewQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
          </section>
          <ul className="strength-sensitivity-boundaries">
            {sensitivityReview.knownBoundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
          </ul>
          <small className="strength-sensitivity-null-state">
            official:null · expert verdict:null · overall:null · result:null · 只读投影
          </small>
        </div>
      </details>

      <div id="bazi-ten-god-reading" className="ten-god-reading-heading">
        <div><p className="eyebrow">Ten Gods × position</p><h3>十神落在四柱，当前工程候选如何阅读</h3></div>
        <p>先按六场景一致性显示“可能补偏 / 可能增偏 / 条件性”，再公开基线与四道反转复核门；它不是十神的永久吉凶标签。</p>
      </div>
      <div className="ten-god-reading-grid" role="list" aria-label="四柱十神位置解读">
        {result.pillars.map((reading) => {
          const review = orientationByPosition.get(reading.position);
          const occurrencePillar = occurrencesByPosition.get(reading.position);
          if (!review || !occurrencePillar) return null;
          const directionSensitivity = review.tenGod
            ? tenGodSensitivityByName.get(review.tenGod)
            : null;
          const effectiveDirection = directionSensitivity?.effectiveBalanceDirection ?? review.balanceDirection;
          return (
          <article
            id={`bazi-ten-god-${reading.position}`}
            key={reading.position}
            role="listitem"
            className={reading.availability === "uncertain_hour" ? "is-unavailable" : ""}
            data-baseline-balance-direction={review.balanceDirection}
            data-balance-direction={effectiveDirection}
            data-direction-stability={directionSensitivity?.stability ?? "insufficient"}
            data-overall-good-bad="null"
          >
            <header>
              <div><small>{reading.positionLabel}</small><strong>{reading.ganZhi}</strong></div>
              <StatusPill tone="neutral">{directionSensitivity?.effectiveBalanceDirectionLabel ?? review.balanceDirectionLabel}</StatusPill>
            </header>
            <h4>{reading.focusTenGod ?? "暂不解释"}</h4>
            <p>{reading.directSummary}</p>
            <p className="ten-god-strength-link">{review.directSummary}</p>
            {directionSensitivity ? (
              <p className="ten-god-sensitivity-link">{directionSensitivity.directSummary}</p>
            ) : null}
            <details className="ten-god-orientation-review">
              <summary>查看 4 道喜忌复核门</summary>
              <ul>{review.reviewGates.map((gate) => (
                <li key={gate.key}>
                  <strong>{gate.label} · 未评估</strong>
                  <span>{gate.question}</span>
                </li>
              ))}</ul>
              <small>综合喜忌：null · 事件结果：null · 不评分</small>
            </details>
            {occurrencePillar.availability === "available" ? (
              <details
                className="ten-god-occurrence-review"
                data-position={occurrencePillar.position}
                data-occurrence-count={occurrencePillar.occurrenceCount}
                data-overall-good-bad="null"
              >
                <summary>
                  <span>查看本柱全部 {occurrencePillar.occurrenceCount} 项十神</span>
                  <small>透干 {occurrencePillar.visibleStemCount} · 藏干 {occurrencePillar.hiddenStemCount}</small>
                </summary>
                <p>首屏焦点只用于快速阅读，不代表必然最强；以下按实际透干与藏干逐项保留，重复十神不合并计分。</p>
                <ul aria-label={`${occurrencePillar.positionLabel}全部十神出现项`}>
                  {occurrencePillar.items.map((item) => {
                    const itemSensitivity = tenGodSensitivityByName.get(item.tenGod);
                    return (
                    <li
                      key={item.contentId}
                      className="ten-god-occurrence-item"
                      data-content-id={item.contentId}
                      data-source={item.source}
                      data-baseline-balance-direction={item.balanceDirection}
                      data-balance-direction={itemSensitivity?.effectiveBalanceDirection ?? item.balanceDirection}
                      data-direction-stability={itemSensitivity?.stability ?? "insufficient"}
                      data-overall-good-bad="null"
                      data-result="null"
                    >
                      <header>
                        <div>
                          <small>{item.sourceLabel} · {item.isPrimaryDisplayFocus ? "首屏焦点" : "补充出现项"}</small>
                          <strong>{item.tenGod}</strong>
                        </div>
                        <StatusPill tone="neutral">{itemSensitivity?.effectiveBalanceDirectionLabel ?? item.balanceDirectionLabel}</StatusPill>
                      </header>
                      <p>{item.directSummary}</p>
                      {itemSensitivity ? <p className="ten-god-sensitivity-link">{itemSensitivity.directSummary}</p> : null}
                      <footer>
                        <small>旺衰账权重 {item.strengthRuleWeight}（工程候选） · 4 门未评估</small>
                        <small>{itemSensitivity?.baselineBalanceDirectionLabel ?? item.balanceDirectionLabel} · {item.editorialId} · result:null · overall:null</small>
                      </footer>
                    </li>
                    );
                  })}
                </ul>
              </details>
            ) : (
              <p className="ten-god-occurrence-withheld">时辰未定：本柱透干与藏干十神出现项全部关闭。</p>
            )}
            {reading.editorialId ? <small className="ten-god-editorial-meta">审稿项 {reading.editorialId} · 待专家复核</small> : null}
          </article>
          );
        })}
      </div>

      <ShenshaResearchPreview
        revision={revision}
        interpretation={result}
        tenGodSensitivityReview={tenGodSensitivityReview}
      />

      <BaziCurrentChartHitReviewPanel
        revision={revision}
        interpretation={result}
        strengthSensitivity={sensitivityReview}
        tenGodOccurrences={occurrenceReview}
      />

      <BaziContentReviewQueuePanel />

      <details id="bazi-interpretation-evidence" className="known-gaps interpretation-evidence">
        <summary>查看规则版本、来源和未关闭边界</summary>
        <dl>
          <div><dt>规则包</dt><dd>{result.profile.rulePackId}</dd></div>
          <div><dt>版本 / 流派</dt><dd>{result.profile.ruleVersion} · {result.profile.school}</dd></div>
          <div><dt>十神审稿表</dt><dd>{result.profile.editorialVersion} · {result.profile.editorialCoverage}</dd></div>
          <div><dt>旺衰敏感性层</dt><dd>{sensitivityReview.profile.projectionVersion} · {sensitivityReview.stabilityLabel}</dd></div>
          <div><dt>十神敏感性传播层</dt><dd>{tenGodSensitivityReview.profile.projectionVersion} · {tenGodSensitivityReview.items.length} 神</dd></div>
          <div><dt>整盘首读层</dt><dd>{firstRead.profile.projectionVersion} · 固定 {firstRead.steps.length} 步</dd></div>
          <div><dt>主题索引层</dt><dd>{themeIndex.profile.projectionVersion} · 固定 {themeIndex.items.length} 入口</dd></div>
          <div><dt>内容审稿清单</dt><dd>{BAZI_CONTENT_REVIEW_QUEUE.profile.projectionVersion} · {BAZI_CONTENT_REVIEW_QUEUE.counts.unresolved} 项未裁决</dd></div>
          <div><dt>平衡方向层</dt><dd>{orientationReview.profile.projectionVersion}</dd></div>
          <div><dt>全柱出现项</dt><dd>{occurrenceReview.profile.projectionVersion} · {occurrenceReview.occurrenceCount} 项</dd></div>
          <div><dt>审阅状态</dt><dd>{result.profile.reviewStatus}</dd></div>
          <div><dt>文案权利</dt><dd>{result.profile.rights}</dd></div>
        </dl>
        <ul className="interpretation-source-list" aria-label="八字工程候选代表来源">
          {safeInterpretationSources.map((source) => {
            const sourceHost = interpretationSourceHost(source.url);
            return (
              <li key={source.id} data-source-id={source.id} data-source-state="safe-https">
                <a href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${source.title}，来源域名 ${sourceHost}，在新窗口打开`}>
                  <strong>{source.title}</strong><small>{sourceHost}</small>
                </a>
                <code title={source.id}>{source.id}</code>
                <span>{source.usage}</span>
              </li>
            );
          })}
          {rejectedInterpretationSourceCount ? (
            <li data-source-state="rejected" role="alert">已拒绝显示 {rejectedInterpretationSourceCount} 条非安全 HTTPS、带凭据或含控制字符的来源地址。</li>
          ) : null}
          {!safeInterpretationSources.length && !rejectedInterpretationSourceCount ? <li data-source-state="empty">当前未登记代表来源。</li> : null}
        </ul>
        <h4 className="interpretation-boundaries-title">当前未关闭边界</h4>
        <ul>{result.strength.knownGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
      </details>
    </section>
  );
}
