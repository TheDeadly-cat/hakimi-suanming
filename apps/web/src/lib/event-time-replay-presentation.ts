import type { StoredTimeZoneDatabaseReplayStatus } from "@hakimi/time-core";

export type EventTimeReplayPresentation = Readonly<{
  tone: "info" | "warning";
  label: string;
  boundary: string | null;
}>;

const EVENT_TIME_REPLAY_PRESENTATIONS = {
  current_exact: {
    tone: "info",
    label: "当前工件可复算",
    boundary: null
  },
  retained_exact: {
    tone: "info",
    label: "当前应用保留历史工件",
    boundary: null
  },
  legacy_unidentified: {
    tone: "warning",
    label: "旧版时区工件未识别",
    boundary: "冻结 UTC 与偏移仅按原记录显示；当前应用无法识别原时区工件，未执行 exact replay。"
  },
  artifact_unavailable: {
    tone: "warning",
    label: "当前应用未保留历史工件",
    boundary: "冻结 UTC 与偏移仅按原记录显示；当前应用未保留绑定工件，未执行 exact replay。"
  },
  descriptor_mismatch: {
    tone: "warning",
    label: "时区描述符冲突",
    boundary: "冻结 UTC 与偏移仅按原记录显示；描述符与随包注册表冲突，已禁止 exact replay。"
  }
} satisfies Readonly<Record<StoredTimeZoneDatabaseReplayStatus, EventTimeReplayPresentation>>;

export function getEventTimeReplayPresentation(
  status: StoredTimeZoneDatabaseReplayStatus
): EventTimeReplayPresentation {
  return EVENT_TIME_REPLAY_PRESENTATIONS[status];
}
