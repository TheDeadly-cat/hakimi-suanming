import { RotateCcw } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import type { LuckDirection } from "@hakimi/luck-core";
import type {
  RevisionDerivedReplayRequest,
  RevisionDerivedReplayComponent,
  RevisionDerivedReplayProjection,
  RevisionTransitReplayComponent
} from "@hakimi/revision-replay";
import { shortHash } from "../lib/format";
import { StatusPill } from "./status-pill";
import "./revision-integrity-console.css";
import "./revision-derived-replay-panel.css";

type Props = {
  revision: RevisionRecord;
  atInstant: string | null;
  routeManualDirection: LuckDirection | null;
  onSaveSnapshot?: (request: RevisionDerivedReplayRequest) => Promise<"saved" | "already_saved">;
};

const unavailableCodeLabels = {
  executor_unavailable: "执行器不可用",
  frozen_rule_snapshot_missing: "规则快照缺失",
  unique_birth_instant_missing: "出生瞬时点未锁定",
  manual_direction_required: "需要显式顺逆",
  manual_direction_not_allowed: "不允许覆盖顺逆",
  calculation_failed: "计算失败"
} as const;
const unsafeVisibleTextPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu;
const sensitiveCredentialPattern = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|bearer|secret)\b(?:\s*[:=]\s*|\s+)[^\s,;]+/giu;
const visibleUrlPattern = /\b(?:https?|file):\/\/[^\s"'<>]+/giu;
const localPathPattern = /(?:[a-z]:\\|\\\\)[^\s"'<>]+/giu;
const canonicalSha256Pattern = /^[a-f0-9]{64}$/;
const MAX_RELATION_FACTS = 10_000;
const MAX_LUCK_DECADES = 1_000;
const MAX_TRANSIT_SLOTS = 10_000;

function takeCodePoints(value: string, maxCodePoints: number): string {
  let result = "";
  let count = 0;
  for (const character of value) {
    if (count >= maxCodePoints) break;
    result += character;
    count += 1;
  }
  return result;
}

function safeVisibleText(value: unknown, fallback: string, maxCodePoints = 600): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .replace(unsafeVisibleTextPattern, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return takeCodePoints(normalized, maxCodePoints) || fallback;
}

function isSafeVisibleIdentifier(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && value === trimmed && safeVisibleText(trimmed, "", 512) === trimmed;
}

function isCanonicalSha256(value: unknown): value is string {
  return typeof value === "string" && canonicalSha256Pattern.test(value);
}

function visibleDiagnosticText(value: unknown, fallback: string, maxCodePoints = 600): string {
  const visible = safeVisibleText(value, fallback, maxCodePoints);
  return visible
    .replace(sensitiveCredentialPattern, "[凭据已隐藏]")
    .replace(visibleUrlPattern, "[链接已隐藏]")
    .replace(localPathPattern, "[本地路径已隐藏]");
}

function errorMessage(reason: unknown, fallback: string): string {
  try {
    return visibleDiagnosticText(reason instanceof Error ? reason.message : "", fallback, 360);
  } catch {
    return fallback;
  }
}

function displayIdentifier(value: unknown): string {
  if (!isSafeVisibleIdentifier(value)) return "不可显示";
  const characters = Array.from(value);
  return characters.length <= 96
    ? value
    : `${characters.slice(0, 48).join("")}…${characters.slice(-32).join("")}`;
}

function unavailableCodeLabel(code: unknown): string {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(unavailableCodeLabels, code)
    ? unavailableCodeLabels[code as keyof typeof unavailableCodeLabels]
    : "未知不可用原因";
}

function assertUnavailableMetadata(
  component: { status: string; code?: unknown; reason?: unknown },
  componentLabel: string
): void {
  if (
    component.status !== "unavailable"
    || unavailableCodeLabel(component.code) === "未知不可用原因"
    || !isSafeVisibleIdentifier(component.reason)
  ) {
    throw new Error(`${componentLabel}返回了未知或不完整的不可用状态，已拒绝显示。`);
  }
}

const derivedReplayStages = [
  { title: "源 Revision 复演", detail: "先验证本命工程结果哈希" },
  { title: "精确执行器投影", detail: "不回退当前版本算法" },
  { title: "零写入摘要核对", detail: "重新计算聚合摘要" }
] as const;

type VerifiedProjectionEnvelope = Readonly<{
  projection: RevisionDerivedReplayProjection;
  expectedProfileId: string;
  expectedProfileBinding: string;
}>;

type SnapshotSaveState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "saving" }>
  | Readonly<{ status: "confirmed"; result: "saved" | "already_saved"; message: string }>
  | Readonly<{ status: "preflight_failed"; message: string }>
  | Readonly<{ status: "commit_unknown"; message: string }>;

const IDLE_SNAPSHOT_SAVE_STATE: SnapshotSaveState = { status: "idle" };

function ComponentUnavailable({ component }: {
  component: Extract<RevisionDerivedReplayComponent<unknown>, { status: "unavailable" }>;
}) {
  return (
    <div className="derived-replay-component derived-replay-component--unavailable">
      <StatusPill tone="warning">{unavailableCodeLabels[component.code]}</StatusPill>
      <p>{visibleDiagnosticText(component.reason, "未提供不可用原因", 512)}</p>
    </div>
  );
}

type ProjectionModuleState = "projected" | "unavailable" | "not_requested";

const projectionModuleStateLabels: Record<ProjectionModuleState, string> = {
  projected: "已投影",
  unavailable: "不可用",
  not_requested: "未请求"
};

function ProjectionModuleHeader({ title, subtitle, state }: { title: string; subtitle: string; state: ProjectionModuleState }) {
  return (
    <header>
      <div><h3>{title}</h3><small>{subtitle}</small></div>
      <span className="derived-replay-module-state">{projectionModuleStateLabels[state]}</span>
    </header>
  );
}

function normalizeExplicitInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error("运限目标必须包含明确的 Z 或 UTC 偏移，不能按浏览器本地时区猜测。");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("运限目标不是有效瞬时点。");
  return parsed.toISOString();
}

function requestBindingIssue(
  revision: RevisionRecord,
  atInstant: string | null,
  routeManualDirection: LuckDirection | null
): string | null {
  if (
    !isSafeVisibleIdentifier(revision.id)
    || !Number.isSafeInteger(revision.revisionNumber)
    || revision.revisionNumber <= 0
    || !isCanonicalSha256(revision.manifest.resultHash)
    || (revision.manifest.luckCycleRuleDigest !== null && !isCanonicalSha256(revision.manifest.luckCycleRuleDigest))
  ) {
    return "当前 Revision 缺少有效 ID、编号、本命结果哈希或起运规则绑定。";
  }
  if (revision.input.sex !== "male" && revision.input.sex !== "female" && revision.input.sex !== "unspecified") {
    return "当前 Revision 的性别枚举不属于本版本支持范围。";
  }
  if (routeManualDirection !== null && routeManualDirection !== "forward" && routeManualDirection !== "backward") {
    return "路由中的人工顺逆参数不属于受支持枚举。";
  }
  if (revision.input.sex !== "unspecified" && routeManualDirection !== null) {
    return "当前 Revision 已指定性别，路由中的人工顺逆参数不能被静默忽略；请移除该参数后再执行。";
  }
  if (atInstant !== null) {
    try {
      normalizeExplicitInstant(atInstant);
    } catch (reason) {
      return errorMessage(reason, "运限目标无法完成明确瞬时点校验。");
    }
  }
  return null;
}

function assertProjectionBinding(
  projection: RevisionDerivedReplayProjection,
  expectedRevisionId: string,
  expectedAtInstant: string | null,
  expectedManualDirection: LuckDirection | null,
  expectedProfileId: string,
  expectedProfileBinding: string,
  expectedNatalResultHash: string
): void {
  if (!projection || typeof projection !== "object" || !projection.request || !projection.profile) {
    throw new Error("派生投影结构不完整，已拒绝显示。");
  }
  if (projection.sourceRevisionId !== expectedRevisionId) {
    throw new Error("派生投影没有绑定当前源 Revision，已拒绝显示。");
  }
  if (
    projection.request.atInstant !== expectedAtInstant ||
    projection.request.manualDirection !== expectedManualDirection
  ) {
    throw new Error("派生投影返回的请求参数与本次明确提交不一致，已拒绝显示。");
  }
  if (projection.profile.profileId !== expectedProfileId) {
    throw new Error("派生投影返回了未请求的执行 Profile，已拒绝显示。");
  }
  if (JSON.stringify(projection.profile) !== expectedProfileBinding) {
    throw new Error("派生投影返回的完整 Profile 绑定与本次执行契约不一致，已拒绝显示。");
  }
  if (projection.sourceNatalResultHash !== expectedNatalResultHash) {
    throw new Error("派生投影返回的本命结果哈希与当前 Revision 不一致，已拒绝显示。");
  }
  if (!isCanonicalSha256(projection.projectionDigest)) {
    throw new Error("派生投影缺少规范 SHA-256 聚合摘要，已拒绝显示。");
  }
  if (projection.status !== "complete" && projection.status !== "partial") {
    throw new Error("派生投影返回了未知的聚合状态，已拒绝显示。");
  }
  const relations = projection.relations;
  if (relations.status !== "projected" && relations.status !== "unavailable") {
    throw new Error("干支关系返回了未知状态，已拒绝显示。");
  }
  if (relations.status === "projected") {
    if (
      !isSafeVisibleIdentifier(relations.executorId)
      || !isCanonicalSha256(relations.resultDigest)
      || !Array.isArray(relations.result?.facts)
      || relations.result.facts.length > MAX_RELATION_FACTS
    ) {
      throw new Error("干支关系投影缺少执行器、摘要或事实列表，已拒绝显示。");
    }
  } else {
    assertUnavailableMetadata(relations, "干支关系");
  }
  const luckCycle = projection.luckCycle;
  if (luckCycle.status !== "projected" && luckCycle.status !== "unavailable") {
    throw new Error("起运与大运返回了未知状态，已拒绝显示。");
  }
  if (luckCycle.status === "projected") {
    if (
      !isSafeVisibleIdentifier(luckCycle.executorId)
      || !isCanonicalSha256(luckCycle.resultDigest)
      || !Array.isArray(luckCycle.result?.decades)
      || luckCycle.result.decades.length > MAX_LUCK_DECADES
      || (luckCycle.result?.direction?.value !== "forward" && luckCycle.result?.direction?.value !== "backward")
    ) {
      throw new Error("起运与大运投影缺少执行器、摘要、方向或大运列表，已拒绝显示。");
    }
  } else {
    assertUnavailableMetadata(luckCycle, "起运与大运");
  }
  const transit = projection.transit;
  if (transit.status !== "projected" && transit.status !== "unavailable" && transit.status !== "not_requested") {
    throw new Error("运限切片返回了未知状态，已拒绝显示。");
  }
  if (transit.status === "projected") {
    const transitSlots = transit.result?.slots;
    if (
      !isSafeVisibleIdentifier(transit.executorId)
      || !isCanonicalSha256(transit.resultDigest)
      || !transitSlots
      || typeof transitSlots !== "object"
      || Array.isArray(transitSlots)
    ) {
      throw new Error("运限切片投影缺少执行器、摘要或层级结果，已拒绝显示。");
    }
    let transitSlotCount = 0;
    for (const slotKey in transitSlots) {
      if (!Object.prototype.hasOwnProperty.call(transitSlots, slotKey)) continue;
      transitSlotCount += 1;
      if (transitSlotCount > MAX_TRANSIT_SLOTS || !isSafeVisibleIdentifier(slotKey)) {
        throw new Error("运限切片投影包含过多或不可安全显示的层级键，已拒绝显示。");
      }
    }
  } else if (transit.status === "unavailable") {
    assertUnavailableMetadata(transit, "运限切片");
  } else if (!isSafeVisibleIdentifier(transit.reason)) {
    throw new Error("未请求的运限切片缺少可核对原因，已拒绝显示。");
  }
  if (
    (expectedAtInstant === null && projection.transit.status !== "not_requested")
    || (expectedAtInstant !== null && projection.transit.status === "not_requested")
  ) {
    throw new Error("运限组件状态与本次是否明确请求目标瞬时点不一致，已拒绝显示。");
  }
  const requiredComponents = expectedAtInstant === null
    ? [projection.relations, projection.luckCycle]
    : [projection.relations, projection.luckCycle, projection.transit];
  const expectedProjectionStatus = requiredComponents.every((component) => component.status === "projected")
    ? "complete"
    : "partial";
  if (projection.status !== expectedProjectionStatus) {
    throw new Error("派生投影聚合状态无法由本次请求所需组件复算，已拒绝显示。");
  }
}

function RelationsProjection({ projection }: { projection: RevisionDerivedReplayProjection }) {
  const component = projection.relations;
  return (
    <article className="derived-replay-module" data-component-status={component.status}>
      <ProjectionModuleHeader title="干支关系" subtitle="显式关系执行器" state={component.status} />
      {component.status === "projected" ? <>
        <strong>{component.result.facts.length} 条关系记录</strong>
        <p className="mono" title={safeVisibleText(component.resultDigest, "")}>摘要 {displayIdentifier(component.resultDigest)}</p>
        <small>{safeVisibleText(component.executorId, "执行器未登记", 160)}</small>
      </> : <ComponentUnavailable component={component} />}
    </article>
  );
}

function LuckProjection({ projection }: { projection: RevisionDerivedReplayProjection }) {
  const component = projection.luckCycle;
  return (
    <article className="derived-replay-module" data-component-status={component.status}>
      <ProjectionModuleHeader title="起运与大运" subtitle="冻结规则快照" state={component.status} />
      {component.status === "projected" ? <>
        <strong>{component.result.direction.value === "forward" ? "顺行" : component.result.direction.value === "backward" ? "逆行" : "方向不可识别"} · {component.result.decades.length} 柱</strong>
        <p className="mono" title={safeVisibleText(component.resultDigest, "")}>摘要 {displayIdentifier(component.resultDigest)}</p>
        <small>{safeVisibleText(component.executorId, "执行器未登记", 160)}</small>
      </> : <ComponentUnavailable component={component} />}
    </article>
  );
}

function TransitProjection({ component }: { component: RevisionTransitReplayComponent }) {
  let totalCount = 0;
  let resolvedCount = 0;
  if (component.status === "projected") {
    for (const slot of Object.values(component.result.slots)) {
      totalCount += 1;
      if (slot.status === "resolved") resolvedCount += 1;
    }
  }
  return (
    <article className="derived-replay-module" data-component-status={component.status}>
      <ProjectionModuleHeader title="运限切片" subtitle="指定瞬时点" state={component.status} />
      {component.status === "projected" ? <>
        <strong>{resolvedCount}/{totalCount} 层已解析</strong>
        <p className="mono" title={safeVisibleText(component.resultDigest, "")}>摘要 {displayIdentifier(component.resultDigest)}</p>
        <small>{safeVisibleText(component.executorId, "执行器未登记", 160)}</small>
      </> : component.status === "not_requested" ? (
        <div className="derived-replay-component"><StatusPill tone="neutral">未请求</StatusPill><p>{visibleDiagnosticText(component.reason, "未提供未请求原因", 512)}</p></div>
      ) : <ComponentUnavailable component={component} />}
    </article>
  );
}

function ProjectionEvidenceDisclosure({ projection }: { projection: RevisionDerivedReplayProjection }) {
  const entries: Array<{ label: string; value: string }> = [
    {
      label: "Profile binding",
      value: `${projection.profile.profileId} · contract v${projection.profile.schemaVersion}`
    },
    { label: "Natal result hash", value: projection.sourceNatalResultHash },
    { label: "Projection digest", value: projection.projectionDigest }
  ];
  if (projection.relations.status === "projected") {
    entries.push({ label: "Relations digest", value: projection.relations.resultDigest });
  }
  if (projection.luckCycle.status === "projected") {
    entries.push({ label: "Luck-cycle digest", value: projection.luckCycle.resultDigest });
  }
  if (projection.transit.status === "projected") {
    entries.push({ label: "Transit digest", value: projection.transit.resultDigest });
  }
  return (
    <details className="derived-replay-evidence-disclosure">
      <summary><span>完整执行绑定</span><small>{entries.length} 条可选择核对值</small></summary>
      <dl aria-label="本次显式派生完整执行绑定">
        {entries.map((entry) => (
          <div key={entry.label}>
            <dt>{entry.label}</dt>
            <dd><code>{safeVisibleText(entry.value, "不可显示", 2_048)}</code></dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function RevisionDerivedReplayPanel({ revision, atInstant, routeManualDirection, onSaveSnapshot }: Props) {
  const titleId = useId();
  const boundaryId = useId();
  const directionHelpId = useId();
  const luckCycleRuleBinding = revision.manifest.luckCycleRuleDigest ?? "legacy-inferred";
  const bindingKey = JSON.stringify({
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    natalResultHash: revision.manifest.resultHash,
    luckCycleRuleBinding,
    inputSex: revision.input.sex,
    atInstant,
    routeManualDirection
  });
  const [stateBindingKey, setStateBindingKey] = useState(bindingKey);
  const [manualDirection, setManualDirection] = useState<LuckDirection | "">(
    revision.input.sex === "unspecified" ? routeManualDirection ?? "" : ""
  );
  const [verifiedProjection, setVerifiedProjection] = useState<VerifiedProjectionEnvelope | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SnapshotSaveState>(IDLE_SNAPSHOT_SAVE_STATE);
  const runGeneration = useRef(0);
  const runBusyRef = useRef(false);
  const saveBusyRef = useRef(false);
  const bindingCurrent = stateBindingKey === bindingKey;
  const visibleManualDirection = bindingCurrent
    ? manualDirection
    : revision.input.sex === "unspecified" ? routeManualDirection ?? "" : "";
  const visibleProjectionEnvelope = bindingCurrent ? verifiedProjection : null;
  const visibleProjection = visibleProjectionEnvelope?.projection ?? null;
  const visibleRunning = bindingCurrent && running;
  const visibleError = bindingCurrent ? error : null;
  const visibleSaveState = bindingCurrent ? saveState : IDLE_SNAPSHOT_SAVE_STATE;
  const visibleSaving = visibleSaveState.status === "saving";
  const saveConfirmed = visibleSaveState.status === "confirmed";
  const savePreflightFailed = visibleSaveState.status === "preflight_failed";
  const saveCommitUnknown = visibleSaveState.status === "commit_unknown";
  const saveLocked = saveConfirmed || saveCommitUnknown;
  const requestIssue = requestBindingIssue(revision, atInstant, routeManualDirection);
  const manualDirectionMissing = revision.input.sex === "unspecified" && visibleManualDirection === "";

  useLayoutEffect(() => {
    const generation = ++runGeneration.current;
    setStateBindingKey(bindingKey);
    setVerifiedProjection(null);
    setError(null);
    setSaveState(IDLE_SNAPSHOT_SAVE_STATE);
    setRunning(false);
    runBusyRef.current = false;
    saveBusyRef.current = false;
    setManualDirection(revision.input.sex === "unspecified" ? routeManualDirection ?? "" : "");
    return () => {
      if (runGeneration.current === generation) runGeneration.current += 1;
    };
  }, [bindingKey, revision.input.sex, routeManualDirection]);

  const runProjection = async () => {
    if (!bindingCurrent || requestIssue || manualDirectionMissing || saveLocked || runBusyRef.current || saveBusyRef.current) return;
    const generation = ++runGeneration.current;
    runBusyRef.current = true;
    setRunning(true);
    setVerifiedProjection(null);
    setError(null);
    setSaveState(IDLE_SNAPSHOT_SAVE_STATE);
    try {
      const {
        CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        replayRevisionDerivedProjection,
        verifyRevisionDerivedReplayProjectionAgainstRevision
      } = await import("@hakimi/revision-replay");
      if (generation !== runGeneration.current) return;
      const expectedProfileBinding = JSON.stringify(CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE);
      const replayAtInstant = atInstant === null ? null : normalizeExplicitInstant(atInstant);
      const replayManualDirection = manualDirection || null;
      const generatedProjection = await replayRevisionDerivedProjection(revision, {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        ...(replayAtInstant ? { atInstant: replayAtInstant } : {}),
        ...(replayManualDirection ? { manualDirection: replayManualDirection } : {})
      });
      if (generation !== runGeneration.current) return;
      const nextProjection = await verifyRevisionDerivedReplayProjectionAgainstRevision(
        generatedProjection,
        revision
      );
      if (generation !== runGeneration.current) return;
      assertProjectionBinding(
        nextProjection,
        revision.id,
        replayAtInstant,
        replayManualDirection,
        CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
        expectedProfileBinding,
        revision.manifest.resultHash
      );
      if (generation === runGeneration.current) {
        setVerifiedProjection({
          projection: nextProjection,
          expectedProfileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
          expectedProfileBinding
        });
      }
    } catch (reason) {
      if (generation === runGeneration.current) {
        setError(errorMessage(reason, "显式版本派生失败。"));
      }
    } finally {
      if (generation === runGeneration.current) {
        runBusyRef.current = false;
        setRunning(false);
      }
    }
  };

  const changeManualDirection = (value: string) => {
    if (runBusyRef.current || saveBusyRef.current || saveLocked) return;
    const next: LuckDirection | "" = value === "forward" || value === "backward" ? value : "";
    runGeneration.current += 1;
    runBusyRef.current = false;
    setRunning(false);
    setVerifiedProjection(null);
    setError(null);
    setSaveState(IDLE_SNAPSHOT_SAVE_STATE);
    setManualDirection(next);
  };

  const saveProjection = async () => {
    const saveSnapshot = onSaveSnapshot;
    if (
      !bindingCurrent
      || !visibleProjectionEnvelope
      || !saveSnapshot
      || visibleSaving
      || saveLocked
      || saveBusyRef.current
      || runBusyRef.current
    ) return;
    const { projection: projectionToSave, expectedProfileId, expectedProfileBinding } = visibleProjectionEnvelope;
    let replayAtInstant: string | null;
    let replayManualDirection: LuckDirection | null;
    try {
      replayAtInstant = atInstant === null ? null : normalizeExplicitInstant(atInstant);
      replayManualDirection = revision.input.sex === "unspecified" ? visibleManualDirection || null : null;
      assertProjectionBinding(
        projectionToSave,
        revision.id,
        replayAtInstant,
        replayManualDirection,
        expectedProfileId,
        expectedProfileBinding,
        revision.manifest.resultHash
      );
    } catch (reason) {
      setSaveState({
        status: "preflight_failed",
        message: errorMessage(reason, "保存请求未通过本地绑定预检。")
      });
      return;
    }
    const generation = ++runGeneration.current;
    saveBusyRef.current = true;
    setSaveState({ status: "saving" });
    try {
      const status = await saveSnapshot({
        profile: projectionToSave.profile,
        ...(projectionToSave.request.atInstant ? { atInstant: projectionToSave.request.atInstant } : {}),
        ...(projectionToSave.request.manualDirection ? { manualDirection: projectionToSave.request.manualDirection } : {})
      });
      if (status !== "saved" && status !== "already_saved") {
        if (generation === runGeneration.current) {
          setSaveState({
            status: "commit_unknown",
            message: "保存回调已返回，但仓储状态无法识别。请先重新读取历史收据核对；本面板已锁定重复提交。"
          });
        }
        return;
      }
      if (generation === runGeneration.current) {
        setSaveState({
          status: "confirmed",
          result: status,
          message: status === "saved"
            ? "上层回调报告计算快照已追加；本面板尚未重新读取仓储核对。"
            : "上层回调报告相同计算请求已存在；本面板尚未重新读取仓储核对。"
        });
      }
    } catch (reason) {
      if (generation === runGeneration.current) {
        const detail = errorMessage(reason, "保存回调没有返回可确认结果。");
        setSaveState({
          status: "commit_unknown",
          message: `保存回调已被调用，但最终提交状态无法确认：${detail} 请先重新读取历史收据核对；本面板已锁定重复提交。`
        });
      }
    } finally {
      if (generation === runGeneration.current) {
        saveBusyRef.current = false;
      }
    }
  };

  const operationState = visibleRunning
    ? "running"
    : visibleSaving
      ? "saving"
      : saveCommitUnknown
        ? "commit_unknown"
        : requestIssue || visibleError || savePreflightFailed
        ? "error"
          : saveConfirmed
          ? "saved"
          : visibleProjection
            ? "bound"
            : manualDirectionMissing
              ? "blocked"
              : "idle";
  const panelStatus = requestIssue
    ? { label: "请求受阻", tone: "cinnabar" as const }
    : saveCommitUnknown
      ? { label: "保存状态待核对", tone: "cinnabar" as const }
    : visibleError || savePreflightFailed
      ? { label: "操作失败关闭", tone: "cinnabar" as const }
      : visibleRunning
        ? { label: "正在生成投影", tone: "info" as const }
          : visibleSaving
          ? { label: "正在保存收据", tone: "info" as const }
          : saveConfirmed
            ? { label: "保存回调已返回", tone: "info" as const }
          : manualDirectionMissing
            ? { label: "等待人工顺逆", tone: "warning" as const }
            : visibleProjection?.status === "complete"
            ? { label: "所需组件已投影", tone: "info" as const }
              : visibleProjection
                ? { label: "部分所需组件不可用", tone: "warning" as const }
                : { label: "不冒充旧输出", tone: "neutral" as const };
  const saveLedgerLabel = !onSaveSnapshot
    ? "否 · 仅显式版本派生"
    : visibleSaveState.status === "confirmed"
      ? visibleSaveState.result === "saved" ? "回调报告已追加 · 未 readback" : "回调报告已存在 · 未 readback"
      : visibleSaveState.status === "commit_unknown"
        ? "提交状态不确定 · 必须重新读取"
        : visibleSaveState.status === "preflight_failed"
          ? "保存请求未发出 · 本地预检失败"
          : visibleSaveState.status === "saving"
            ? "保存回调执行中"
            : "本次投影尚未保存；历史收据见上方";
  const writeObservation = visibleSaving
    ? "in_flight"
    : saveCommitUnknown
      ? "unknown_requires_readback"
      : saveConfirmed
        ? visibleSaveState.result === "saved"
          ? "callback_reported_saved_unread"
          : "callback_reported_existing_unread"
        : "none_observed";

  return (
    <section
      className="flat-section revision-replay-panel derived-replay-panel"
      aria-labelledby={titleId}
      aria-describedby={boundaryId}
      aria-busy={visibleRunning || visibleSaving}
      data-projection-status={visibleProjection?.status ?? "idle"}
      data-request-state={requestIssue || manualDirectionMissing ? "blocked" : visibleRunning ? "running" : "valid"}
      data-operation-state={operationState}
      data-write-capability={onSaveSnapshot ? "explicit_callback" : "read_only"}
      data-luck-cycle-rule-binding={requestIssue ? "invalid" : luckCycleRuleBinding}
      data-save-lock-state={saveLocked ? "locked" : "open"}
      data-save-readback-verified="false"
      data-save-confirmation-authority="callback-only-no-readback"
      data-write-observation={writeObservation}
      data-record-write-performed={writeObservation === "none_observed" ? "false" : "unverified"}
      data-release-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-evidence-authority="engineering-integrity-only"
      data-engineering-integrity-only="true"
      data-source-revision-mutated="false"
      data-mutation-mode={onSaveSnapshot ? "parent-coordinated-append-only-callback" : "read-only-no-mutation"}
      data-mutation-epoch-required={onSaveSnapshot ? "true" : "false"}
      data-mutation-epoch-bypassed="false"
      data-expert-truth-claimed="false"
      data-public-release-authorized="false"
    >
      <div className="section-heading-row">
        <div><p className="eyebrow">Explicit executor derivation</p><h2 id={titleId}>显式版本派生投影</h2></div>
        <StatusPill tone={panelStatus.tone}>{panelStatus.label}</StatusPill>
      </div>
      <p id={boundaryId} className="revision-replay-copy"><strong>派生边界：</strong>旧 Revision 没有保存当时的关系、起运和运限输出及执行器绑定，因此这里不会声称“与旧输出一致”。系统会先核对本命盘工程复演一致，再按当前显式 Profile 尝试生成零写入投影；实际执行器会在结果卡逐项登记，不可用时不会回退到其他算法。保存按钮的确认只代表上层回调返回状态，本面板不执行收据 readback。结果不代表命理专家金标或公开发布授权。<small className="derived-replay-release-baseline">legacy-v13 · Schema 13 · migration null · parent-coordinated mutation epoch · public release false</small></p>
      <dl className="revision-receipt-binding-rail derived-replay-binding-rail" aria-label="显式版本派生输入身份">
        <div data-binding="revision"><dt>Source Revision</dt><dd><code title={safeVisibleText(revision.id, "")}>{requestIssue ? "绑定待修复" : shortHash(revision.id)}</code><span>R{revision.revisionNumber} · 只读源</span></dd></div>
        <div data-binding="snapshot"><dt>Natal result hash</dt><dd><code title={safeVisibleText(revision.manifest.resultHash, "")}>{requestIssue ? "绑定待修复" : shortHash(revision.manifest.resultHash)}</code><span>投影返回时必须一致</span></dd></div>
        <div data-binding="history"><dt>Luck rule binding</dt><dd><code title={revision.manifest.luckCycleRuleDigest ? safeVisibleText(revision.manifest.luckCycleRuleDigest, "") : undefined}>{requestIssue ? "绑定待修复" : revision.manifest.luckCycleRuleDigest ? shortHash(revision.manifest.luckCycleRuleDigest) : "legacy-inferred"}</code><span>{revision.manifest.luckCycleRuleDigest ? "冻结摘要已登记" : "旧记录未登记显式摘要"}</span></dd></div>
        <div data-binding="replay"><dt>Write gate</dt><dd><strong>{onSaveSnapshot ? "父级受控保存回调可用" : "只读模式"}</strong><span>{saveLocked ? "同一请求已锁定" : onSaveSnapshot ? "mutation epoch 由父级协调" : "默认零写入"}</span></dd></div>
      </dl>
      <ol
        className="derived-replay-pipeline"
        data-run-state={visibleRunning ? "running" : visibleProjection ? "complete" : "idle"}
        aria-label="显式派生验证路径"
        style={{ "--derived-replay-stage-count": derivedReplayStages.length } as CSSProperties}
      >
        {derivedReplayStages.map((stage, index) => (
          <li key={stage.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.title}</strong>
            <small>{stage.detail}</small>
          </li>
        ))}
      </ol>
      <dl className="metadata-list derived-replay-request">
        <div><dt>源 Revision</dt><dd>R{revision.revisionNumber} · <code title={safeVisibleText(revision.id, "")}>{displayIdentifier(revision.id)}</code> · 只读</dd></div>
        <div><dt>运限目标</dt><dd>{atInstant ? safeVisibleText(atInstant, "目标时刻不可显示") : "未请求；可从运限页带入目标时刻"}</dd></div>
        <div><dt>人工顺逆</dt><dd>{revision.input.sex === "unspecified" ? visibleManualDirection === "forward" ? "顺行" : visibleManualDirection === "backward" ? "逆行" : "未选择 · 不猜测" : "由锁版规则决定 · 禁止覆盖"}</dd></div>
        <div><dt>计算收据</dt><dd>{saveLedgerLabel}</dd></div>
      </dl>
      {requestIssue ? <div className="inline-error derived-replay-request-error" role="alert"><strong>显式请求未通过预检</strong><p>{requestIssue}</p></div> : null}
      {revision.input.sex === "unspecified" ? (
        <label className="field derived-replay-direction">
          <span>起运顺逆</span>
          <select aria-label="起运顺逆" aria-describedby={directionHelpId} value={visibleManualDirection} disabled={!bindingCurrent || visibleRunning || visibleSaving || saveLocked} onChange={(event) => changeManualDirection(event.target.value)}>
            <option value="">不猜测</option>
            <option value="forward">顺行</option>
            <option value="backward">逆行</option>
          </select>
          <small id={directionHelpId}>{saveLocked ? "保存状态已锁定；必须重新读取历史收据后才能更改请求。" : "性别未指定时必须人工选择；留空会失败关闭。"}</small>
        </label>
      ) : null}
      <button type="button" className="secondary-action derived-replay-run" disabled={!bindingCurrent || Boolean(requestIssue) || manualDirectionMissing || visibleRunning || visibleSaving || saveLocked} aria-busy={visibleRunning} onClick={runProjection}>
        <RotateCcw aria-hidden="true" />{visibleRunning ? "正在生成只读投影…" : saveLocked ? "保存状态已锁定，先重新读取" : visibleError ? "重新生成只读显式派生投影" : "生成只读显式派生投影"}
      </button>
      {visibleError ? <div className="inline-error derived-replay-run-error" role="alert"><strong>派生未完成</strong><p>{visibleError}</p><small>失败结果未保留；再次操作会重新载入显式执行模块并从当前 Revision 重新派生。</small></div> : null}
      {visibleProjection ? <>
        <div className="derived-replay-grid">
          <RelationsProjection projection={visibleProjection} />
          <LuckProjection projection={visibleProjection} />
          <TransitProjection component={visibleProjection.transit} />
        </div>
        <div className="revision-replay-result derived-replay-result" role="status">
          <strong>{visibleProjection.status === "complete" ? "本次请求所需组件均已生成，源 Revision 未改写" : "部分所需组件不可用，源 Revision 未改写"}</strong>
          <p>Profile {safeVisibleText(visibleProjection.profile.profileId, "Profile 不可显示", 160)}；投影摘要 <span className="mono" title={safeVisibleText(visibleProjection.projectionDigest, "")}>{displayIdentifier(visibleProjection.projectionDigest)}</span>。</p>
        </div>
        <ProjectionEvidenceDisclosure projection={visibleProjection} />
        {onSaveSnapshot && (visibleProjection.request.atInstant || visibleProjection.request.manualDirection) ? (
          <div
            className="derived-replay-save"
            data-mutation-state={visibleSaving
              ? "saving"
              : saveConfirmed
                ? "confirmed"
                : saveCommitUnknown
                  ? "commit_unknown"
                  : savePreflightFailed
                    ? "preflight_failed"
                    : "explicit"}
          >
            <div className="derived-replay-mutation-copy" role="note">
              <strong>{visibleSaving
                ? "受控保存回调执行中"
                : saveConfirmed
                  ? "上层保存回调已返回可识别状态"
                  : saveCommitUnknown
                    ? "提交结果必须先重新读取核对"
                    : "以下操作将离开零写入阶段"}</strong>
              <span>{saveConfirmed
                ? "本面板已锁定重复提交；确认只覆盖上层回调返回值，仍需从历史收据重新读取核对，也不代表术数专家真值。"
                : saveCommitUnknown
                  ? "不能从回调异常推断未写入，也不能安全重试；请先读取历史收据确认是否已追加。"
                  : "只有再次点击按钮才会调用上层受控保存能力；仓储必须重新计算并以 append-only 收据处理，页面内投影不会被直接写入。"}</span>
            </div>
            <button type="button" className="primary-action" disabled={visibleSaving || saveLocked} aria-busy={visibleSaving} onClick={saveProjection}>
              {visibleSaving
                ? "正在重新计算并追加…"
                : saveConfirmed
                  ? "保存回调已返回"
                  : saveCommitUnknown
                    ? "保存状态待重新读取"
                    : "显式追加为计算收据"}
            </button>
            <small>{saveLocked
              ? "如需再次提交，必须先离开本面板并从仓储重新读取计算收据。"
              : "保存时由仓储重新计算并生成只追加收据，不直接写入页面内存中的投影。"}</small>
          </div>
        ) : null}
        {visibleSaveState.status === "confirmed" ? (
          <div className="derived-replay-save-message" data-save-state="confirmed" role="status">
            <strong>上层回调状态已返回</strong><span>{visibleSaveState.message}</span>
          </div>
        ) : null}
        {visibleSaveState.status === "preflight_failed" ? (
          <div className="inline-error" role="alert"><strong>保存请求未发出</strong><p>{visibleSaveState.message}</p></div>
        ) : null}
        {visibleSaveState.status === "commit_unknown" ? (
          <div className="inline-error derived-replay-save-uncertain" role="alert">
            <strong>保存提交状态未确认</strong><p>{visibleSaveState.message}</p>
          </div>
        ) : null}
      </> : null}
    </section>
  );
}
