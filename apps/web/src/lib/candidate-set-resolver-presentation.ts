import type { StoredTimeZoneDatabaseReplayStatus } from "@hakimi/time-core";

export type CandidateSetResolverPresentation = Readonly<{
  tone: "info" | "warning";
  label: string;
  explanation: string;
  exactResolverAvailable: boolean;
}>;

const CANDIDATE_SET_RESOLVER_PRESENTATIONS = {
  current_exact: {
    tone: "info",
    label: "当前 resolver 工件可核对",
    explanation: "已存内容可按当前随包时区 resolver 核对名称、结构与摘要；尚未重跑 13 个历史探针。",
    exactResolverAvailable: true
  },
  retained_exact: {
    tone: "info",
    label: "保留历史 resolver 工件可核对",
    explanation: "已存内容可按随包保留的原时区 resolver 核对名称、结构与摘要；尚未重跑原历史程序的 13 个探针。",
    exactResolverAvailable: true
  },
  legacy_unidentified: {
    tone: "warning",
    label: "降级读取 · 旧 tzdb 未识别",
    explanation: "仅核对冻结结构与摘要完整性；无法认领 exact resolver 或整组历史重算。",
    exactResolverAvailable: false
  },
  artifact_unavailable: {
    tone: "warning",
    label: "降级读取 · 原工件未保留",
    explanation: "仅核对冻结结构与摘要完整性；当前应用没有绑定工件，无法认领 exact resolver。",
    exactResolverAvailable: false
  },
  descriptor_mismatch: {
    tone: "warning",
    label: "时区工件描述符冲突",
    explanation: "仅允许冻结内容完整性读取；不能认领 exact resolver，也不会把相同 snapshotId 当作工件匹配。",
    exactResolverAvailable: false
  }
} satisfies Readonly<Record<StoredTimeZoneDatabaseReplayStatus, CandidateSetResolverPresentation>>;

export function getCandidateSetResolverPresentation(
  status: StoredTimeZoneDatabaseReplayStatus
): CandidateSetResolverPresentation {
  return CANDIDATE_SET_RESOLVER_PRESENTATIONS[status];
}
