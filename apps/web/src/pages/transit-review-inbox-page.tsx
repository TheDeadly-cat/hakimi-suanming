import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson2,
  Inbox,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pickFile, webReportExportPort } from "@hakimi/platform";
import { PageHeading } from "../components/page-heading";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "../components/prepared-file-delivery-dialog";
import { StatusPill } from "../components/status-pill";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage as errorMessage, safeVisibleText } from "../lib/visible-text";
import {
  MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES,
  deleteTransitReviewInboxArtifact,
  importTransitReviewInboxArtifact,
  readTransitReviewInboxArtifactBytes,
  readTransitReviewInboxProjection,
  type TransitReviewInboxArtifact,
  type TransitReviewInboxArtifactStatus,
  type TransitReviewInboxProjection
} from "../lib/transit-review-inbox";
import "./transit-review-inbox-page.css";

type Operation = "loading" | "refresh" | "import" | "export_bundle" | "download" | "delete";
type ArtifactFilter = "all" | "current" | "waiting" | "passed" | "attention";
type InboxWorkspace = "batches" | "artifacts";

const EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT = 18;

type Feedback = {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
};

type ArtifactCommitIssue = {
  operation: "import" | "delete";
  certainty: "call_unknown" | "returned_unreconciled";
  attachmentId: string | null;
  fileName: string;
  rawContentHash: string;
  byteLength: number;
  message: string;
};

const KIND_LABELS: Record<TransitReviewInboxArtifact["kind"], string> = {
  review_bundle: `${EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT} 条候选审核包`,
  independent_review: "独立审核",
  adjudication: "裁决回填",
  unknown: "当前版本无法识别"
};

const STATUS_LABELS: Record<TransitReviewInboxArtifactStatus, string> = {
  bundle_current: "当前候选包",
  waiting_for_review_bundle: "等待审核包",
  waiting_for_independent_reviews: "等待确切双审",
  review_structure_passed_unverified: "结构预检通过 · 身份未核验",
  adjudication_structure_passed_unverified: "裁决结构通过 · 金标 +0",
  preflight_failed: "当前协议预检失败",
  local_record_corrupt: "本地原件异常"
};

const ARTIFACT_FILTERS: ReadonlyArray<{ value: ArtifactFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "current", label: "当前候选包" },
  { value: "waiting", label: "等待依赖" },
  { value: "passed", label: "结构通过" },
  { value: "attention", label: "需要处理" }
];

const OPERATION_LABELS: Record<Operation, string> = {
  loading: "正在读取本地审核原件",
  refresh: "正在重新读取并运行当前协议预检",
  import: "正在验证并保存审核工件",
  export_bundle: "正在冻结当前候选审核包",
  download: "正在按摘要读取并冻结原始字节",
  delete: "正在永久删除所选本地原件"
};

const OPERATION_HINTS: Record<Operation, string> = {
  loading: "完成前不显示空箱或沿用上次页面投影。",
  refresh: "本次结果只来自刚刚读取的本地字节。",
  import: "内容、摘要和依赖预检完成前不会写入收件箱。",
  export_bundle: "准备文件不会自动入箱，也不会增加人工验证金标。",
  download: "冻结内容必须继续匹配列表记录的原始摘要。",
  delete: "依赖工件不会级联删除，完成后会重新派生全部状态。"
};

const DISPLAY_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function statusTone(status: TransitReviewInboxArtifactStatus): "jade" | "warning" | "cinnabar" | "info" {
  if (status === "bundle_current") return "info";
  if (status === "review_structure_passed_unverified" || status === "adjudication_structure_passed_unverified") return "info";
  if (status === "waiting_for_review_bundle" || status === "waiting_for_independent_reviews") return "warning";
  if (status === "preflight_failed" || status === "local_record_corrupt") return "cinnabar";
  return "info";
}

function matchesArtifactFilter(artifact: TransitReviewInboxArtifact, filter: ArtifactFilter): boolean {
  if (filter === "all") return true;
  if (filter === "current") return artifact.status === "bundle_current";
  if (filter === "waiting") {
    return artifact.status === "waiting_for_review_bundle" || artifact.status === "waiting_for_independent_reviews";
  }
  if (filter === "passed") {
    return artifact.status === "review_structure_passed_unverified"
      || artifact.status === "adjudication_structure_passed_unverified";
  }
  return artifact.status === "preflight_failed" || artifact.status === "local_record_corrupt";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function shortDigest(value: string | null): string {
  if (!value) return "—";
  const visibleValue = safeVisibleText(value, "摘要不可用", 180);
  return visibleValue.length > 22
    ? `${visibleValue.slice(0, 12)}…${visibleValue.slice(-8)}`
    : visibleValue;
}

function displayTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? DISPLAY_TIME_FORMATTER.format(timestamp)
    : safeVisibleText(value, "时间未识别", 80);
}

function projectionIntegrityIssue(projection: TransitReviewInboxProjection): string | null {
  if (
    projection.evidenceBoundary !== "local_unverified" ||
    projection.identityVerified !== false ||
    projection.sourceAuthenticityVerified !== false ||
    projection.eligibleForFixtureIntegration !== false ||
    projection.countsAsVerifiedGold !== false ||
    projection.verifiedTransitFactsDelta !== 0 ||
    projection.verifiedQueryAdjudicationsDelta !== 0
  ) {
    return "收件箱投影越过了本地未核验、金标零增量或 fixture 门禁边界。";
  }
  if (!Number.isFinite(Date.parse(projection.refreshedAt))) {
    return "收件箱投影包含无效重读时间。";
  }
  if (Object.values(projection.summary).some((value) => !Number.isInteger(value) || value < 0)) {
    return "收件箱投影包含无效汇总计数。";
  }
  if (projection.summary.storedArtifacts !== projection.artifacts.length) {
    return "收件箱汇总数量与原件索引不一致。";
  }
  const artifactsById = new Map(projection.artifacts.map((artifact) => [artifact.attachmentId, artifact]));
  if (artifactsById.size !== projection.artifacts.length) {
    return "收件箱投影包含重复原件 ID。";
  }
  if (projection.artifacts.some((artifact) => (
    !artifact.attachmentId.trim() ||
    !artifact.fileName.trim() ||
    !/^[0-9a-f]{64}$/u.test(artifact.rawContentHash) ||
    !Number.isSafeInteger(artifact.byteLength) ||
    artifact.byteLength <= 0 ||
    artifact.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES ||
    !Number.isFinite(Date.parse(artifact.importedAt))
  ))) {
    return "收件箱投影包含空身份、无效原始摘要、原件大小或接收时间。";
  }
  if (projection.batches.some((batch) => !batch.reviewBundleDigest.trim())) {
    return "收件箱投影包含空审核批次摘要。";
  }
  if (new Set(projection.batches.map((batch) => batch.reviewBundleDigest)).size !== projection.batches.length) {
    return "收件箱投影包含重复审核批次。";
  }
  const waitingDependencies = projection.artifacts.filter((artifact) => (
    artifact.status === "waiting_for_review_bundle" ||
    artifact.status === "waiting_for_independent_reviews"
  )).length;
  if (projection.summary.waitingDependencies !== waitingDependencies) {
    return "等待依赖汇总与原件状态不一致。";
  }
  const failedOrCorrupt = projection.artifacts.filter((artifact) => (
    artifact.status === "preflight_failed" || artifact.status === "local_record_corrupt"
  )).length;
  if (projection.summary.failedOrCorrupt !== failedOrCorrupt) {
    return "异常原件汇总与原件状态不一致。";
  }
  if (projection.summary.currentBundles !== projection.batches.filter((batch) => batch.currentBundle).length) {
    return "当前候选包汇总与审核批次绑定不一致。";
  }
  let modeledPassedReviews = 0;
  let modeledPassedAdjudications = 0;
  for (const batch of projection.batches) {
    if (batch.candidates.some((candidate) => !candidate.candidateId.trim())) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 包含空候选 ID。`;
    }
    if (new Set(batch.candidates.map((candidate) => candidate.candidateId)).size !== batch.candidates.length) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 包含重复候选 ID。`;
    }
    if (batch.currentBundle && batch.candidates.length !== EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT) {
      return `当前审核批次 ${shortDigest(batch.reviewBundleDigest)} 未精确绑定 ${EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT} 个候选。`;
    }
    const referencedArtifactIds = [
      ...batch.bundleArtifactIds,
      ...batch.candidates.flatMap((candidate) => [
        ...candidate.reviewArtifactIds,
        ...candidate.adjudicationArtifactIds
      ]),
      ...batch.orphanArtifactIds
    ];
    if (referencedArtifactIds.some((attachmentId) => !attachmentId.trim())) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 包含空原件引用。`;
    }
    if (new Set(referencedArtifactIds).size !== referencedArtifactIds.length) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 重复引用同一本地原件。`;
    }
    for (const attachmentId of referencedArtifactIds) {
      const artifact = artifactsById.get(attachmentId);
      if (!artifact || artifact.reviewBundleDigest !== batch.reviewBundleDigest) {
        return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 包含缺失或跨摘要绑定的原件。`;
      }
    }
    const expectedArtifactIds = projection.artifacts
      .filter((artifact) => artifact.reviewBundleDigest === batch.reviewBundleDigest)
      .map((artifact) => artifact.attachmentId);
    if (
      expectedArtifactIds.length !== referencedArtifactIds.length ||
      expectedArtifactIds.some((attachmentId) => !referencedArtifactIds.includes(attachmentId))
    ) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 没有完整归组该摘要下的本地原件。`;
    }
    const bundleArtifacts = batch.bundleArtifactIds.map((attachmentId) => artifactsById.get(attachmentId)!);
    if (bundleArtifacts.some((artifact) => artifact.kind !== "review_bundle")) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 的审核包 ID 指向了错误工件类型。`;
    }
    const derivedCurrentBundle = bundleArtifacts.some((artifact) => artifact.status === "bundle_current");
    if (derivedCurrentBundle !== batch.currentBundle) {
      return `审核批次 ${shortDigest(batch.reviewBundleDigest)} 的当前包标记与原件预检状态不一致。`;
    }
    for (const candidate of batch.candidates) {
      if (
        !Number.isInteger(candidate.passedReviewCount) ||
        candidate.passedReviewCount < 0 ||
        candidate.passedReviewCount > candidate.reviewArtifactIds.length ||
        !Number.isInteger(candidate.passedAdjudicationCount) ||
        candidate.passedAdjudicationCount < 0 ||
        candidate.passedAdjudicationCount > candidate.adjudicationArtifactIds.length
      ) {
        return `候选 ${candidate.candidateId} 的结构通过计数与关联原件不一致。`;
      }
      if (candidate.reviewArtifactIds.some((attachmentId) => {
        const artifact = artifactsById.get(attachmentId);
        return artifact?.kind !== "independent_review" || artifact.candidateId !== candidate.candidateId;
      })) {
        return `候选 ${candidate.candidateId} 包含错误绑定的独立审核原件。`;
      }
      if (candidate.adjudicationArtifactIds.some((attachmentId) => {
        const artifact = artifactsById.get(attachmentId);
        return artifact?.kind !== "adjudication" || artifact.candidateId !== candidate.candidateId;
      })) {
        return `候选 ${candidate.candidateId} 包含错误绑定的裁决原件。`;
      }
      modeledPassedReviews += candidate.passedReviewCount;
      modeledPassedAdjudications += candidate.passedAdjudicationCount;
    }
  }
  if (modeledPassedReviews !== projection.summary.passedIndependentReviews) {
    return "独立审核结构通过汇总与候选精确绑定计数不一致。";
  }
  if (modeledPassedAdjudications !== projection.summary.passedAdjudications) {
    return "裁决结构通过汇总与候选精确绑定计数不一致。";
  }
  return null;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function FeedbackMessage({ feedback, onDismiss }: { feedback: Feedback | null; onDismiss: () => void }) {
  if (!feedback) return null;
  return (
    <aside className={`review-inbox-feedback is-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"} aria-live={feedback.tone === "error" ? "assertive" : "polite"} aria-atomic="true">
      <div><p className="eyebrow">Inbox operation</p><strong>{safeVisibleText(feedback.title, "收件箱操作", 120)}</strong><p>{safeVisibleText(feedback.message, "操作状态不可用。")}</p></div>
      <button type="button" className="icon-button" aria-label="关闭收件箱操作反馈" onClick={onDismiss}><X aria-hidden="true" /></button>
    </aside>
  );
}

export function TransitReviewInboxPage() {
  const [projection, setProjection] = useState<TransitReviewInboxProjection | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation | null>("loading");
  const [operationSubjectId, setOperationSubjectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [artifactCommitIssue, setArtifactCommitIssue] = useState<ArtifactCommitIssue | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [artifactFilter, setArtifactFilter] = useState<ArtifactFilter>("all");
  const [activeWorkspace, setActiveWorkspace] = useState<InboxWorkspace>("batches");
  const [expandedBatchDigests, setExpandedBatchDigests] = useState<Set<string>>(() => new Set());
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const mountedRef = useRef(true);
  const operationRef = useRef<Operation | null>(null);
  const artifactMutationReconciliationRef = useRef(false);
  const deleteConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const deleteReturnFocusRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (deleteId) deleteConfirmButtonRef.current?.focus();
  }, [deleteId]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = ["batches", "artifacts"]
      .map((workspace) => document.getElementById(`review-inbox-${workspace}`))
      .filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const nearestVisible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top - 150) - Math.abs(right.boundingClientRect.top - 150))[0];
      const workspace = (nearestVisible?.target as HTMLElement | undefined)?.dataset.inboxWorkspace;
      if (workspace === "batches" || workspace === "artifacts") setActiveWorkspace(workspace);
    }, { rootMargin: "-140px 0px -58% 0px", threshold: [0, 0.08, 0.35] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const beginOperation = useCallback((nextOperation: Operation, subjectId: string | null = null): boolean => {
    if (
      operationRef.current !== null
      || (artifactMutationReconciliationRef.current && (nextOperation === "import" || nextOperation === "delete"))
    ) return false;
    operationRef.current = nextOperation;
    if (mountedRef.current) {
      setOperation(nextOperation);
      setOperationSubjectId(subjectId);
    }
    return true;
  }, []);

  const finishOperation = useCallback((completedOperation: Operation) => {
    if (operationRef.current !== completedOperation) return;
    operationRef.current = null;
    if (mountedRef.current) {
      setOperation(null);
      setOperationSubjectId(null);
    }
  }, []);

  const refresh = useCallback(async (mode: "initial" | "manual" | "mutation" = "manual") => {
    const ownedOperation = mode === "mutation" ? null : mode === "initial" ? "loading" : "refresh";
    if (ownedOperation && !beginOperation(ownedOperation)) return null;
    if (!mountedRef.current) return null;
    setReadError(null);
    try {
      const next = await readTransitReviewInboxProjection();
      const integrityIssue = projectionIntegrityIssue(next);
      if (integrityIssue) throw new Error(integrityIssue);
      if (!mountedRef.current) return null;
      setPreparedDelivery(null);
      setProjection(next);
      setExpandedBatchDigests((current) => {
        const available = new Set(next.batches.map((batch) => batch.reviewBundleDigest));
        const retained = new Set([...current].filter((digest) => available.has(digest)));
        if (retained.size === 0 && next.batches.length === 1) retained.add(next.batches[0]!.reviewBundleDigest);
        return retained;
      });
      if (mode === "manual") {
        setFeedback({
          tone: "success",
          title: "已从原始字节重新预检",
          message: `重新读取 ${next.summary.storedArtifacts} 个本地工件；未使用上次页面留下的状态。`
        });
      }
      return next;
    } catch (reason) {
      if (!mountedRef.current) return null;
      const failure = errorMessage(reason, "无法读取并重新预检本地审核原件。");
      setProjection(null);
      setDeleteId(null);
      setPreparedDelivery(null);
      setReadError(failure);
      setFeedback({
        tone: "error",
        title: "审核收件箱读取失败",
        message: failure
      });
      return null;
    } finally {
      if (ownedOperation) finishOperation(ownedOperation);
    }
  }, [beginOperation, finishOperation]);

  useEffect(() => {
    void refresh("initial");
  }, [refresh]);

  const importArtifact = async () => {
    if (!beginOperation("import")) return;
    setFeedback(null);
    let returnedCommit: ArtifactCommitIssue | null = null;
    let unconfirmedAttempt: ArtifactCommitIssue | null = null;
    try {
      const file = await pickFile({
        accept: ".json,application/json",
        maxBytes: MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES
      });
      if (!file) return;
      const bytes = new Uint8Array(await file.blob.arrayBuffer());
      const rawContentHash = await sha256Hex(bytes);
      unconfirmedAttempt = {
        operation: "import",
        certainty: "call_unknown",
        attachmentId: null,
        fileName: file.name,
        rawContentHash,
        byteLength: bytes.byteLength,
        message: "导入调用已发出，但没有返回可确认的原件 ID；不要重复导入，先从本地原始字节只读重核。"
      };
      setPreparedDelivery(null);
      const result = await importTransitReviewInboxArtifact({
        fileName: file.name,
        bytes
      });
      returnedCommit = {
        operation: "import",
        certainty: "returned_unreconciled",
        attachmentId: result.attachment.id,
        fileName: result.attachment.fileName,
        rawContentHash: result.attachment.contentHash,
        byteLength: result.attachment.byteLength,
        message: "导入调用已经返回，但尚未完成从本地原始字节重新派生后的精确绑定核对。"
      };
      artifactMutationReconciliationRef.current = true;
      const refreshed = await refresh("mutation");
      if (!refreshed || !mountedRef.current) {
        if (mountedRef.current) {
          setArtifactCommitIssue({
            ...returnedCommit,
            message: "导入调用已经返回，但收件箱重读失败。不要重复导入同一文件；请使用只读重新核对。"
          });
          setFeedback({
            tone: "info",
            title: "审核原件写入已返回，等待重核",
            message: "当前只锁定新的导入与删除；原件准备、候选包准备和只读重读仍可使用。"
          });
        }
        return;
      }
      const storedArtifact = refreshed.artifacts.find((artifact) => artifact.attachmentId === result.attachment.id);
      if (
        !storedArtifact ||
        storedArtifact.rawContentHash !== result.attachment.contentHash ||
        storedArtifact.byteLength !== result.attachment.byteLength ||
        storedArtifact.fileName !== result.attachment.fileName
      ) {
        throw new Error("审核原件可能已经写入，但重读投影无法证明本次返回的原件 ID、摘要、大小与文件名仍然一致。");
      }
      setFeedback({
        tone: "success",
        title: result.created ? "审核原件已保存" : "相同原件已存在",
        message: result.created
          ? `${KIND_LABELS[result.artifact.kind]}已按原始字节 SHA-256 写入本机，并会进入完整备份；可信等级仍是“本地未核验”。`
          : `已复用内容完全相同的本地原件，没有新增副本；SHA-256 不证明专家身份。`
      });
      artifactMutationReconciliationRef.current = false;
      setArtifactCommitIssue(null);
    } catch (reason) {
      if (!mountedRef.current) return;
      if (returnedCommit) {
        setArtifactCommitIssue({
          ...returnedCommit,
          message: `${errorMessage(reason, "重读投影未能确认返回原件。")} 写入调用已经返回；不要重复导入同一文件。`
        });
        setFeedback({
          tone: "info",
          title: "审核原件写入已返回，绑定待核对",
          message: "页面没有把后处理异常误报为写入失败；请执行只读重新核对。"
        });
        return;
      }
      if (unconfirmedAttempt) {
        artifactMutationReconciliationRef.current = true;
        setArtifactCommitIssue({
          ...unconfirmedAttempt,
          message: `${errorMessage(reason, "导入调用没有返回确认。")} 原始文件身份已冻结；不要重复导入，先执行只读重核。`
        });
        setFeedback({
          tone: "info",
          title: "审核原件导入结果未知",
          message: "当前会话已锁定新的导入与删除。只有重读投影找到唯一匹配的文件名、原始 SHA-256 与字节长度后，才会解除写入锁。"
        });
        return;
      }
      setFeedback({
        tone: "error",
        title: "审核工件未保存",
        message: errorMessage(reason, "文件不是当前协议可识别且摘要完整的审核工件。")
      });
    } finally {
      finishOperation("import");
    }
  };

  const exportCurrentBundle = async () => {
    if (!beginOperation("export_bundle")) return;
    setFeedback(null);
    try {
      const {
        createTransitQueryReviewBundle,
        serializeTransitQueryReviewBundle
      } = await import("@hakimi/research-query/transit-review");
      const bundle = await createTransitQueryReviewBundle();
      const content = serializeTransitQueryReviewBundle(bundle);
      const serializedBundle = JSON.parse(content) as {
        payload?: { candidates?: unknown[] };
      };
      const candidateCount = Array.isArray(serializedBundle.payload?.candidates)
        ? serializedBundle.payload.candidates.length
        : -1;
      if (candidateCount !== EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT) {
        throw new Error(`当前审核包必须精确包含 ${EXPECTED_CURRENT_BUNDLE_CANDIDATE_COUNT} 条候选，实际为 ${candidateCount < 0 ? "不可识别" : candidateCount}。`);
      }
      const frozenAt = new Date().toISOString();
      const frozenBlob = new Blob([content], { type: "application/json;charset=utf-8" });
      if (
        !Number.isSafeInteger(frozenBlob.size)
        || frozenBlob.size <= 0
        || frozenBlob.size > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES
      ) {
        throw new Error(`当前审核包必须是非空 JSON，且不能超过 ${formatBytes(MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES)}。`);
      }
      if (!mountedRef.current) return;
      setPreparedDelivery({
        blob: frozenBlob,
        filename: `hakimi-transit-query-review-${frozenAt.slice(0, 10)}.json`,
        title: "当前 18 条运限候选审核包",
        sharePolicy: "allowed",
        description: "这份审核包已冻结，仅供指定复核人使用；准备或交付都不会自动写入收件箱、增加人工验证金标或获得公开发布授权。"
      });
      setFeedback({
        tone: "info",
        title: "候选审核包已准备",
        message: `同一份 ${formatBytes(frozenBlob.size)} 冻结内容将用于下载、指定位置保存或系统分享；目前尚未发生交付，也不会自动增加人工验证金标。`
      });
    } catch (reason) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: "error",
        title: "候选审核包准备失败",
        message: errorMessage(reason, "无法生成当前运限候选审核包。")
      });
    } finally {
      finishOperation("export_bundle");
    }
  };

  const downloadArtifact = async (artifact: TransitReviewInboxArtifact) => {
    if (!beginOperation("download", artifact.attachmentId)) return;
    setFeedback(null);
    try {
      const bytes = await readTransitReviewInboxArtifactBytes(artifact);
      const copy = Uint8Array.from(bytes);
      if (
        !Number.isSafeInteger(copy.byteLength)
        || copy.byteLength <= 0
        || copy.byteLength > MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES
      ) {
        throw new Error(`审核原件必须非空，且不能超过 ${formatBytes(MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES)}。`);
      }
      const frozenRawContentHash = await sha256Hex(copy);
      if (copy.byteLength !== artifact.byteLength || frozenRawContentHash !== artifact.rawContentHash) {
        throw new Error("按摘要读取的原始字节长度或 SHA-256 与当前列表快照不一致，已停止准备。");
      }
      if (!mountedRef.current) return;
      setPreparedDelivery({
        blob: new Blob([copy], { type: "application/json" }),
        filename: artifact.fileName,
        title: `审核原件 · ${artifact.fileName}`,
        sharePolicy: "blocked_sensitive",
        description: "原始回填字节已按当前列表摘要重新读取并冻结；其中可能包含复核人身份、批注与裁决材料，只能下载或保存到可信位置，不能进入系统分享。"
      });
      setFeedback({
        tone: "info",
        title: "审核原件已准备",
        message: "同一份冻结字节将用于下载或指定位置保存；目前尚未发生交付，系统分享保持关闭。"
      });
    } catch (reason) {
      if (!mountedRef.current) return;
      setFeedback({
        tone: "error",
        title: "审核原件准备失败",
        message: errorMessage(reason, "无法按列表中的原始摘要读取该文件。")
      });
    } finally {
      finishOperation("download");
    }
  };

  const deleteArtifact = async (artifact: TransitReviewInboxArtifact) => {
    if (!beginOperation("delete", artifact.attachmentId)) return;
    setFeedback(null);
    let returnedCommit: ArtifactCommitIssue | null = null;
    let deleteCallAttempted = false;
    try {
      setPreparedDelivery(null);
      deleteCallAttempted = true;
      await deleteTransitReviewInboxArtifact(artifact);
      returnedCommit = {
        operation: "delete",
        certainty: "returned_unreconciled",
        attachmentId: artifact.attachmentId,
        fileName: artifact.fileName,
        rawContentHash: artifact.rawContentHash,
        byteLength: artifact.byteLength,
        message: "删除调用已经返回，但尚未完成从本地原始字节重新派生后的缺失核对。"
      };
      artifactMutationReconciliationRef.current = true;
      setDeleteId(null);
      deleteReturnFocusRef.current = null;
      const refreshed = await refresh("mutation");
      if (!refreshed || !mountedRef.current) {
        if (mountedRef.current) {
          setArtifactCommitIssue({
            ...returnedCommit,
            message: "删除调用已经返回，但收件箱重读失败。不要重复删除；请使用只读重新核对。"
          });
          setFeedback({
            tone: "info",
            title: "审核原件删除已返回，等待重核",
            message: "当前只锁定新的导入与删除；原件准备、候选包准备和只读重读仍可使用。"
          });
        }
        return;
      }
      if (refreshed.artifacts.some((item) => item.attachmentId === artifact.attachmentId)) {
        throw new Error("删除请求可能已经执行，但重读投影仍包含同一原件 ID，因此不能声明删除成功。");
      }
      setFeedback({
        tone: "success",
        title: "审核原件已永久删除",
        message: `${artifact.fileName} 的本地元数据与原始字节已删除；其他依赖工件会在本次刷新后回到等待状态。`
      });
      artifactMutationReconciliationRef.current = false;
      setArtifactCommitIssue(null);
    } catch (reason) {
      if (!mountedRef.current) return;
      if (deleteCallAttempted && !returnedCommit) {
        const issue: ArtifactCommitIssue = {
          operation: "delete",
          certainty: "call_unknown",
          attachmentId: artifact.attachmentId,
          fileName: artifact.fileName,
          rawContentHash: artifact.rawContentHash,
          byteLength: artifact.byteLength,
          message: `${errorMessage(reason, "删除调用未返回确认。")} 删除调用已发出；不要重复删除，先只读重新核对当前收件箱。`
        };
        artifactMutationReconciliationRef.current = true;
        setArtifactCommitIssue(issue);
        setDeleteId(null);
        deleteReturnFocusRef.current = null;
        setFeedback({
          tone: "info",
          title: "审核原件删除结果未知",
          message: "当前会话已锁定重复导入和删除。请使用只读重新核对确认该原件是否仍在收件箱。"
        });
        return;
      }
      if (returnedCommit) {
        setArtifactCommitIssue({
          ...returnedCommit,
          message: `${errorMessage(reason, "重读投影未能确认原件已经删除。")} 删除调用已经返回；不要重复删除。`
        });
        setFeedback({
          tone: "info",
          title: "审核原件删除已返回，结果待核对",
          message: "页面没有把后处理异常误报为删除失败；请执行只读重新核对。"
        });
        return;
      }
      setFeedback({
        tone: "error",
        title: "审核原件未删除",
        message: errorMessage(reason, "文件可能已在其他标签页或恢复操作中变化，已保持不动。")
      });
    } finally {
      finishOperation("delete");
    }
  };

  const openDeleteConfirmation = (attachmentId: string, trigger: HTMLButtonElement) => {
    deleteReturnFocusRef.current = trigger;
    setDeleteId(attachmentId);
  };

  const cancelDeleteConfirmation = () => {
    const trigger = deleteReturnFocusRef.current;
    deleteReturnFocusRef.current = null;
    setDeleteId(null);
    window.setTimeout(() => {
      if (trigger?.isConnected) trigger.focus();
    }, 0);
  };

  const recheckArtifactCommit = async () => {
    const issue = artifactCommitIssue;
    if (!issue || operationRef.current !== null) return;
    const refreshed = await refresh("manual");
    if (!refreshed || !mountedRef.current) return;
    const contentImportMatches = issue.operation === "import"
      ? refreshed.artifacts.filter((artifact) => (
          artifact.rawContentHash === issue.rawContentHash
          && artifact.byteLength === issue.byteLength
        ))
      : [];
    const namedImportMatches = contentImportMatches.filter((artifact) => artifact.fileName === issue.fileName);
    const current = issue.attachmentId
      ? refreshed.artifacts.find((artifact) => artifact.attachmentId === issue.attachmentId) ?? null
      : namedImportMatches.length === 1
        ? namedImportMatches[0]!
        : contentImportMatches.length === 1
          ? contentImportMatches[0]!
        : null;
    const confirmed = issue.operation === "import"
      ? Boolean(
          current
          && current.rawContentHash === issue.rawContentHash
          && current.byteLength === issue.byteLength
          && (issue.attachmentId === null || current.fileName === issue.fileName)
        )
      : current === null;
    if (!confirmed) {
      setFeedback({
        tone: "error",
        title: "写入回执仍未通过重核",
        message: issue.operation === "import"
          ? issue.attachmentId
            ? "重读结果没有同时匹配返回的原件 ID、文件名、原始摘要与字节长度；写入锁保持。"
            : contentImportMatches.length === 0
              ? "重读结果尚未找到匹配原始 SHA-256 与字节长度的工件；写入锁保持。"
              : "重读结果存在多个相同原始内容记录，无法唯一收敛本次调用；写入锁保持。"
          : "重读结果仍包含返回的原件 ID；删除锁保持。"
      });
      return;
    }
    const reconciledExistingDuplicate = issue.operation === "import"
      && issue.attachmentId === null
      && current !== null
      && current.fileName !== issue.fileName;
    artifactMutationReconciliationRef.current = false;
    setArtifactCommitIssue(null);
    setFeedback({
      tone: "success",
      title: issue.operation === "import" ? "审核原件写入已重新核对" : "审核原件删除已重新核对",
      message: issue.operation === "import"
        ? issue.certainty === "call_unknown"
          ? reconciledExistingDuplicate
            ? `当前投影已按原始 SHA-256 与字节长度收敛到既有原件 ${current?.fileName ?? ""}；不同文件名没有被当成新证据，导入与删除已重新开放。`
            : "当前原始字节投影已找到唯一匹配的文件名、原始 SHA-256 与字节长度；导入与删除操作已重新开放。"
          : "当前原始字节投影精确匹配写入回执；导入与删除操作已重新开放。"
        : "当前原始字节投影已确认该原件 ID 不存在；导入与删除操作已重新开放。"
    });
  };

  const busy = operation !== null;
  const mutationLocked = busy || artifactCommitIssue !== null;
  const summary = projection?.summary;
  const structurePassCount = (summary?.passedIndependentReviews ?? 0) + (summary?.passedAdjudications ?? 0);
  const artifacts = useMemo(() => [...(projection?.artifacts ?? [])].sort((left, right) => {
    const timestampOrder = Date.parse(right.importedAt) - Date.parse(left.importedAt);
    if (timestampOrder !== 0) return timestampOrder;
    return left.attachmentId < right.attachmentId ? -1 : left.attachmentId > right.attachmentId ? 1 : 0;
  }), [projection?.artifacts]);
  const artifactFilterCounts = useMemo<Record<ArtifactFilter, number>>(() => ({
    all: artifacts.length,
    current: artifacts.filter((artifact) => matchesArtifactFilter(artifact, "current")).length,
    waiting: artifacts.filter((artifact) => matchesArtifactFilter(artifact, "waiting")).length,
    passed: artifacts.filter((artifact) => matchesArtifactFilter(artifact, "passed")).length,
    attention: artifacts.filter((artifact) => matchesArtifactFilter(artifact, "attention")).length
  }), [artifacts]);
  const filteredArtifacts = useMemo(
    () => artifacts.filter((artifact) => matchesArtifactFilter(artifact, artifactFilter)),
    [artifactFilter, artifacts]
  );
  const activeArtifactFilterLabel = ARTIFACT_FILTERS.find((filter) => filter.value === artifactFilter)?.label ?? "全部";
  const batchCandidateCount = projection?.batches.reduce((total, batch) => total + batch.candidates.length, 0) ?? null;
  const operationSubjectName = operationSubjectId
    ? artifacts.find((artifact) => artifact.attachmentId === operationSubjectId)?.fileName ?? operationSubjectId
    : null;
  const allBatchesExpanded = Boolean(projection?.batches.length) && projection!.batches.every((batch) => expandedBatchDigests.has(batch.reviewBundleDigest));

  const toggleAllBatches = () => {
    setExpandedBatchDigests(allBatchesExpanded
      ? new Set()
      : new Set(projection?.batches.map((batch) => batch.reviewBundleDigest) ?? []));
  };

  return (
    <div
      className="page page--transit-review-inbox"
      aria-busy={busy}
      data-projection-state={readError ? "unavailable" : projection ? "ready" : "loading"}
      data-active-workspace={activeWorkspace}
      data-artifact-filter={artifactFilter}
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only="true"
      data-evidence-authority="engineering-only"
      data-write-reconciliation-required={artifactCommitIssue ? "true" : "false"}
      data-prepared-delivery={preparedDelivery ? "ready" : "none"}
      data-file-delivery-certainty={preparedDelivery ? "prepared-not-delivered" : "none"}
      data-operation={operation ?? "idle"}
      data-mutation-mode="epoch-guarded"
      data-mutation-state={artifactCommitIssue ? "reconciliation-required" : busy ? "operation-in-flight" : "ready"}
      data-write-mode={artifactCommitIssue ? "reconciliation-only" : busy ? "locked" : "available"}
      data-projection-integrity="checked-at-load"
      data-original-file-authority="byte-bound"
      data-identity-verification="external-not-verified"
      data-verified-gold-delta="0"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-epoch-bypassed="false"
    >
      <PageHeading
        eyebrow="Local unverified review inbox"
        title="未核验审核收件箱"
        description="保存运限查询候选包、逐候选独立审核和裁决回填的原始 JSON；每次打开都从字节重新跑当前协议，不把缓存状态当证据。"
        actions={(
          <>
            <AppLink
              className="secondary-action"
              href="/settings"
              aria-disabled={mutationLocked}
              tabIndex={mutationLocked ? -1 : undefined}
              title={mutationLocked ? "当前操作或未知提交对账完成后才能离开此页" : "返回设置"}
              onClick={(event) => {
                if (mutationLocked) event.preventDefault();
              }}
            >
              <ArrowLeft aria-hidden="true" />返回设置
            </AppLink>
            <button type="button" className="secondary-action" disabled={busy} onClick={() => void exportCurrentBundle()}><Download aria-hidden="true" />准备当前 18 条候选包</button>
            <button type="button" className="primary-action" disabled={mutationLocked || Boolean(readError)} title={readError ? "收件箱重读成功后才能导入" : artifactCommitIssue ? "先只读重新核对上一笔写入回执" : undefined} onClick={() => void importArtifact()}><Upload aria-hidden="true" />导入审核工件</button>
          </>
        )}
      />

      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <section className="review-inbox-boundary" aria-labelledby="review-inbox-boundary-title">
        <ShieldAlert aria-hidden="true" />
        <div>
          <p className="eyebrow">Evidence boundary</p>
          <h2 id="review-inbox-boundary-title">结构通过不等于专家身份已验证</h2>
          <p>本页只验证安全 JSON、内容摘要、当前候选绑定、依赖关系、来源谱系和时间顺序。现实身份与材料真伪仍需维护者在线下可信账本核验；不会自动写入 fixture，也不会打开发布门。</p>
        </div>
        <div className="review-inbox-zero">
          <strong>0</strong>
          <span>专家金标增量</span>
        </div>
      </section>

      <aside className="review-inbox-delivery-boundary" aria-label="审核文件交付边界">
        <Download aria-hidden="true" />
        <div>
          <strong>候选包与回填原件采用不同交付策略</strong>
          <p>候选包可交给指定复核人；原始回填工件可能包含身份和裁决材料，系统分享关闭。任何准备或交付都不会增加人工验证金标或公开发布授权。</p>
        </div>
      </aside>

      <section className="review-inbox-pipeline" aria-labelledby="review-inbox-pipeline-title" data-state={readError ? "unavailable" : "ready"}>
        <header className="review-inbox-pipeline__heading">
          <div>
            <p className="eyebrow">Chain of custody</p>
            <h2 id="review-inbox-pipeline-title">审核证据流水线</h2>
          </div>
          <p>文件只能沿明确依赖向前推进。结构预检不会跳过现实身份核验，也不会自动进入版本化 fixture。</p>
        </header>
        <ol>
          <li data-state={readError ? "closed" : summary?.storedArtifacts ? "ready" : "waiting"}>
            <span>01</span>
            <div><small>Archive</small><strong>原始字节入箱</strong><p>按内容摘要保存，进入完整备份。</p></div>
            <StatusPill tone={readError ? "cinnabar" : summary?.storedArtifacts ? "info" : "neutral"}>{readError ? "不可判定" : summary?.storedArtifacts ? `${summary.storedArtifacts} 件在库` : "等待原件"}</StatusPill>
          </li>
          <li data-state={readError ? "closed" : structurePassCount ? "ready" : "waiting"}>
            <span>02</span>
            <div><small>Preflight</small><strong>当前协议结构预检</strong><p>核对候选、依赖、谱系与时间顺序。</p></div>
            <StatusPill tone={readError ? "cinnabar" : structurePassCount ? "info" : "neutral"}>{readError ? "不可判定" : structurePassCount ? `结构层 ${structurePassCount} 件` : "尚无通过件"}</StatusPill>
          </li>
          <li data-state={readError ? "closed" : projection?.identityVerified ? "ready" : "closed"}>
            <span>03</span>
            <div><small>Identity</small><strong>现实身份与来源核验</strong><p>由维护者在线下可信账本完成。</p></div>
            <StatusPill tone={readError ? "cinnabar" : projection?.identityVerified ? "info" : "warning"}>{readError ? "不可判定" : projection?.identityVerified ? "已核验" : "页面不判定"}</StatusPill>
          </li>
          <li data-state={readError ? "closed" : projection?.eligibleForFixtureIntegration ? "ready" : "closed"}>
            <span>04</span>
            <div><small>Integration</small><strong>金标与 fixture 整合</strong><p>只接受维护者显式、版本化变更。</p></div>
            <StatusPill tone={readError ? "cinnabar" : projection?.eligibleForFixtureIntegration ? "info" : "warning"}>{readError ? "不可判定" : projection?.eligibleForFixtureIntegration ? "可进入整合" : "门禁关闭"}</StatusPill>
          </li>
        </ol>
      </section>

      <FeedbackMessage feedback={feedback} onDismiss={() => setFeedback(null)} />
      {artifactCommitIssue ? (
        <section className="review-inbox-commit-receipt" role="alert" aria-labelledby="review-inbox-commit-title">
          <ShieldAlert aria-hidden="true" />
          <div>
            <p className="eyebrow">Write receipt</p>
            <h2 id="review-inbox-commit-title">{artifactCommitIssue.operation === "import" ? "导入" : "删除"}{artifactCommitIssue.certainty === "returned_unreconciled" ? "调用已返回" : "调用结果未知"}，等待原始字节重核</h2>
            <p>{safeVisibleText(artifactCommitIssue.message, "写入结果无法核对。")}</p>
            <dl><div><dt>原件</dt><dd>{safeVisibleText(artifactCommitIssue.fileName, "未命名原件", 180)}</dd></div><div><dt>原件 ID</dt><dd>{safeVisibleText(artifactCommitIssue.attachmentId, "调用未返回，尚无可信 ID", 160)}</dd></div><div><dt>原始摘要</dt><dd>{safeVisibleText(artifactCommitIssue.rawContentHash, "摘要不可用", 180)}</dd></div><div><dt>字节长度</dt><dd>{formatBytes(artifactCommitIssue.byteLength)}</dd></div></dl>
            <div className="review-inbox-commit-actions"><button type="button" className="primary-action" disabled={busy} onClick={() => void recheckArtifactCommit()}><RefreshCw aria-hidden="true" />只读重新核对</button><AppLink className="secondary-action" href="/settings/data">打开数据管理</AppLink></div>
            <small>SHA-256 与结构重核仍不证明专家身份，也不会增加人工验证金标或公开发布授权。</small>
          </div>
          <StatusPill tone="warning">{artifactCommitIssue.certainty === "returned_unreconciled" ? "调用已返回 · 待核对" : "调用结果未知"}</StatusPill>
        </section>
      ) : null}
      {operation ? (
        <div className="review-inbox-operation" data-operation={operation} role="status" aria-live="polite" aria-atomic="true">
          <LoaderCircle aria-hidden="true" />
          <div>
            <strong>{OPERATION_LABELS[operation]}</strong>
            <p>{OPERATION_HINTS[operation]}{operationSubjectName ? ` 当前原件：${safeVisibleText(operationSubjectName, "未命名原件", 180)}` : ""}</p>
          </div>
        </div>
      ) : null}

      <section className="review-inbox-metrics" aria-label="审核收件箱概览" aria-busy={operation === "loading" || operation === "refresh"} data-state={readError ? "unavailable" : "ready"}>
        <div><Inbox aria-hidden="true" /><strong>{summary?.storedArtifacts ?? "—"}</strong><span>本地原件</span></div>
        <div><FileJson2 aria-hidden="true" /><strong>{summary?.currentBundles ?? "—"}</strong><span>当前候选包</span></div>
        <div><CheckCircle2 aria-hidden="true" /><strong>{summary?.passedIndependentReviews ?? "—"}</strong><span>独立审核结构通过</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>{summary?.passedAdjudications ?? "—"}</strong><span>裁决结构通过</span></div>
        <div><RefreshCw aria-hidden="true" /><strong>{summary?.waitingDependencies ?? "—"}</strong><span>等待依赖</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>{summary?.failedOrCorrupt ?? "—"}</strong><span>需要处理</span></div>
      </section>

      <nav className="review-inbox-workspace-nav" aria-label="审核收件箱工作区">
        <a
          href="#review-inbox-batches"
          aria-current={activeWorkspace === "batches" ? "location" : undefined}
          onClick={() => setActiveWorkspace("batches")}
        >
          <span>01</span>
          <strong>审核批次</strong>
          <small>{readError ? "投影不可用" : projection ? `${projection.batches.length} 批 · ${batchCandidateCount ?? 0} 个候选` : "正在读取原始字节"}</small>
        </a>
        <a
          href="#review-inbox-artifacts"
          aria-current={activeWorkspace === "artifacts" ? "location" : undefined}
          onClick={() => setActiveWorkspace("artifacts")}
        >
          <span>02</span>
          <strong>本地原件</strong>
          <small>{readError ? "列表不可用" : `${filteredArtifacts.length} / ${artifacts.length} 件 · ${activeArtifactFilterLabel}`}</small>
        </a>
        <p data-state={artifactCommitIssue ? "attention" : "closed"}>
          <small>Evidence boundary</small>
          <strong>{artifactCommitIssue ? "写入待重核 · 导入删除已锁" : "本地未核验 · 金标 +0"}</strong>
        </p>
      </nav>

      <section
        className="review-inbox-batch-workspace"
        id="review-inbox-batches"
        data-inbox-workspace="batches"
        aria-labelledby="review-inbox-batches-title"
      >
        <div className="review-inbox-toolbar">
          <div>
            <h2 id="review-inbox-batches-title">审核批次与 18 候选进度</h2>
            <p>{readError ? "当前投影不可用；没有沿用上一次页面状态。" : projection ? `最后重读：${displayTime(projection.refreshedAt)}` : "正在读取本地原始字节…"}</p>
          </div>
          <div className="review-inbox-toolbar-actions">
            {projection?.batches.length ? <button type="button" className="secondary-action" disabled={busy} aria-pressed={allBatchesExpanded} onClick={toggleAllBatches}>{allBatchesExpanded ? "收起全部批次" : "展开全部批次"}</button> : null}
            <button type="button" className="secondary-action" disabled={busy} onClick={() => void refresh("manual")}><RefreshCw aria-hidden="true" />重新读取并预检</button>
          </div>
        </div>

        {readError ? (
        <div className="review-inbox-empty is-unavailable">
          <ShieldAlert aria-hidden="true" />
          <h2>收件箱投影不可用</h2>
          <p>原始字节没有完成本次重读与协议预检，因此这里不显示空箱、旧批次或近似依赖状态。请使用上方按钮重新读取。</p>
        </div>
      ) : projection?.batches.length ? (
        <div className="review-inbox-batches">
          {projection.batches.map((batch) => {
            const doubleReviewReadyCount = batch.candidates.filter((candidate) => candidate.passedReviewCount >= 2).length;
            const adjudicationPassedCount = batch.candidates.filter((candidate) => candidate.passedAdjudicationCount > 0).length;
            return (
            <details
              key={batch.reviewBundleDigest}
              className="review-inbox-batch"
              data-binding={batch.currentBundle ? "current" : batch.bundleArtifactIds.length ? "noncurrent" : "missing"}
              open={expandedBatchDigests.has(batch.reviewBundleDigest)}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setExpandedBatchDigests((current) => {
                  const next = new Set(current);
                  if (isOpen) next.add(batch.reviewBundleDigest);
                  else next.delete(batch.reviewBundleDigest);
                  return next;
                });
              }}
            >
              <summary>
                <span>
                  <strong>审核批次 {shortDigest(batch.reviewBundleDigest)}</strong>
                  <small>{batch.candidates.length ? `${batch.candidates.length} 个候选` : "候选清单尚不可用"} · {batch.bundleArtifactIds.length ? `${batch.bundleArtifactIds.length} 份审核包原件` : "审核包原件尚未到达"} · {batch.orphanArtifactIds.length ? `${batch.orphanArtifactIds.length} 个待关联工件` : "依赖键已归组"}</small>
                </span>
                <span className="review-inbox-batch-progress" aria-label={`双审结构齐备 ${doubleReviewReadyCount} 个，裁决结构通过 ${adjudicationPassedCount} 个`}>
                  <span><strong>{doubleReviewReadyCount}</strong> 双审结构齐备</span>
                  <span><strong>{adjudicationPassedCount}</strong> 裁决结构通过</span>
                </span>
                <StatusPill tone={batch.currentBundle ? "info" : "warning"}>{batch.currentBundle ? "当前审核包已绑定" : batch.bundleArtifactIds.length ? "非当前或预检失败" : "等待确切审核包"}</StatusPill>
              </summary>
              {batch.candidates.length ? (
                <>
                  <p className="review-inbox-candidate-boundary">候选保持审核包原始顺序；通过数量只表示本地结构工件计数，不用于排序、推荐或生成专家金标。</p>
                  <ol className="review-inbox-candidate-list" aria-label="按审核包固定顺序展示的候选；不按审核数量排序">
                    {batch.candidates.map((candidate) => (
                      <li key={candidate.candidateId}>
                        <span className="review-inbox-candidate-index" aria-hidden="true">{safeVisibleText(candidate.nodeType, "节点", 40)}</span>
                        <div>
                          <strong>{safeVisibleText(candidate.title, "未命名候选", 180)}</strong>
                          <code title={safeVisibleText(candidate.candidateDigest, "摘要不可用", 180)}>{safeVisibleText(candidate.candidateId, "未知候选", 160)}</code>
                        </div>
                          <span className="review-inbox-candidate-progress">独立审核结构通过 {candidate.passedReviewCount} 份</span>
                        <StatusPill tone={candidate.passedAdjudicationCount ? "info" : candidate.passedReviewCount ? "warning" : "neutral"}>
                          {candidate.passedAdjudicationCount
                            ? `裁决结构通过 ${candidate.passedAdjudicationCount} · 金标 +0`
                            : candidate.passedReviewCount >= 2
                              ? "等待确切裁决文件"
                              : candidate.passedReviewCount === 1
                                ? "等待另一份独立审核"
                                : "尚无结构通过的审核"}
                        </StatusPill>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="review-inbox-empty">已收到引用这个批次的子工件，但确切审核包尚未到达；系统不会跨摘要自动拼接。</p>
              )}
            </details>
            );
          })}
        </div>
      ) : operation === "loading" ? (
        <div className="data-empty-state" role="status">正在从本地附件分区读取审核原件…</div>
      ) : (
        <div className="review-inbox-empty">
          <Inbox aria-hidden="true" />
          <h2>还没有审核工件</h2>
          <p>先准备当前 18 条候选审核包并交给指定复核人；收到 JSON 后用统一入口导入。文件类型由内容识别，不依赖文件名或手动选择 A/B。</p>
        </div>
        )}
      </section>

      <section
        className="data-card review-inbox-artifacts"
        id="review-inbox-artifacts"
        data-inbox-workspace="artifacts"
        aria-labelledby="review-inbox-artifacts-title"
      >
        <header className="data-card-heading">
          <div className="data-card-icon"><FileJson2 aria-hidden="true" /></div>
          <div>
            <p className="eyebrow">Raw artifacts</p>
            <h2 id="review-inbox-artifacts-title">本地审核原件</h2>
            <p>保存的是导入时的确切字节。原件进入完整备份；显示状态每次重新派生，不写回附件，也不会伪装成身份签名。</p>
          </div>
          <StatusPill tone={readError ? "cinnabar" : "info"}>{readError ? "不可用" : `${artifacts.length} 个`}</StatusPill>
        </header>
        {readError ? <p className="data-empty-state">原件列表不可用；页面没有把读取失败显示为 0 个工件。</p> : artifacts.length ? (
          <>
            <div className="review-inbox-artifact-filter">
              <div className="review-inbox-artifact-filter__label">
                <SlidersHorizontal aria-hidden="true" />
                <div>
                  <strong>聚焦处理队列</strong>
                  <small>筛选只改变当前视图，不修改原件或派生状态。</small>
                </div>
              </div>
              <div className="review-inbox-filter-options" role="group" aria-label="按审核原件状态筛选">
                {ARTIFACT_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={artifactFilter === filter.value ? "is-active" : undefined}
                    aria-pressed={artifactFilter === filter.value}
                    aria-label={`${filter.label}，${artifactFilterCounts[filter.value]} 个`}
                    disabled={busy}
                    onClick={() => {
                      setArtifactFilter(filter.value);
                      setDeleteId(null);
                    }}
                  >
                    {filter.label}<span aria-hidden="true">{artifactFilterCounts[filter.value]}</span>
                  </button>
                ))}
              </div>
            </div>
            {filteredArtifacts.length ? (
              <ul className="attachment-list review-inbox-artifact-list">
                {filteredArtifacts.map((artifact) => (
                  <li key={artifact.attachmentId} data-status={artifact.status}>
                    <div className="attachment-main">
                      <FileJson2 aria-hidden="true" />
                      <div>
                        <strong>{safeVisibleText(artifact.fileName, "未命名审核原件", 180)}</strong>
                        <small>{KIND_LABELS[artifact.kind]} · {formatBytes(artifact.byteLength)} · 收到于 {displayTime(artifact.importedAt)}</small>
                        <StatusPill tone={statusTone(artifact.status)}>{STATUS_LABELS[artifact.status]}</StatusPill>
                        <code title={safeVisibleText(artifact.rawContentHash, "摘要不可用", 180)}>原始字节 {shortDigest(artifact.rawContentHash)}</code>
                        {artifact.artifactDigest ? <code title={safeVisibleText(artifact.artifactDigest, "摘要不可用", 180)}>工件摘要 {shortDigest(artifact.artifactDigest)}</code> : null}
                        {artifact.candidateId ? <small>候选 {safeVisibleText(artifact.candidateId, "未知候选", 160)}</small> : null}
                        {artifact.errorMessage ? (
                          <details className="review-inbox-error-detail">
                            <summary>查看稳定错误{artifact.errorCode ? ` · ${safeVisibleText(artifact.errorCode, "未识别代码", 80)}` : ""}</summary>
                            <p>{safeVisibleText(artifact.errorMessage, "原件预检失败。")}</p>
                          </details>
                        ) : null}
                      </div>
                    </div>
                    {deleteId === artifact.attachmentId ? (
                      <div
                        className="attachment-delete-confirm"
                        role="group"
                        aria-label={`确认删除审核原件 ${safeVisibleText(artifact.fileName, "未命名审核原件", 180)}`}
                        onKeyDown={(event) => {
                          if (event.key === "Escape" && !busy) {
                            event.preventDefault();
                            cancelDeleteConfirmation();
                          }
                        }}
                      >
                        <strong>永久删除原始字节？依赖工件不会级联删除。</strong>
                        <button ref={deleteConfirmButtonRef} type="button" className="danger-action" disabled={mutationLocked} aria-busy={operation === "delete" && operationSubjectId === artifact.attachmentId} onClick={() => void deleteArtifact(artifact)}>{operation === "delete" && operationSubjectId === artifact.attachmentId ? "删除中…" : "确认删除"}</button>
                        <button type="button" className="secondary-action" disabled={busy} onClick={cancelDeleteConfirmation}>取消</button>
                      </div>
                    ) : (
                      <div className="attachment-actions">
                        <button type="button" className="secondary-action" disabled={busy} aria-busy={operation === "download" && operationSubjectId === artifact.attachmentId} onClick={() => void downloadArtifact(artifact)}><Download aria-hidden="true" />{operation === "download" && operationSubjectId === artifact.attachmentId ? "准备中…" : "准备原件"}</button>
                        <button type="button" className="secondary-action" disabled={mutationLocked} onClick={(event) => openDeleteConfirmation(artifact.attachmentId, event.currentTarget)}><Trash2 aria-hidden="true" />删除</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="review-inbox-filter-empty" role="status">
                <SlidersHorizontal aria-hidden="true" />
                <strong>当前筛选下没有原件</strong>
                <p>切换到“全部”可查看其余本地原件；筛选结果为空不代表收件箱为空。</p>
              </div>
            )}
          </>
        ) : <p className="data-empty-state">没有本地审核原件。无效 JSON、未知格式或摘要不匹配的文件会在写入前被拒绝。</p>}
      </section>
    </div>
  );
}
