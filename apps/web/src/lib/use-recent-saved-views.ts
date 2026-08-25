import { useCallback, useEffect, useRef, useState } from "react";
import { savedViewRecordSchema, type SavedViewRecord } from "@hakimi/contracts";
import { researchRepository } from "@hakimi/storage";

export const RECENT_SAVED_VIEW_INDEX_LIMIT = 128;
const RECENT_SAVED_VIEW_ERROR_LIMIT = 240;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

function parseRecentSavedViews(records: unknown): SavedViewRecord[] {
  if (!Array.isArray(records)) throw new TypeError("最近保存视图索引不是列表。");
  if (records.length > RECENT_SAVED_VIEW_INDEX_LIMIT) {
    throw new RangeError(`最近保存视图索引超过 ${RECENT_SAVED_VIEW_INDEX_LIMIT} 条安全读取上限。`);
  }
  const parsedRecords = records.map((record, index) => {
    const result = savedViewRecordSchema.safeParse(record);
    if (!result.success) {
      throw new TypeError(`最近保存视图第 ${index + 1} 条不符合当前严格契约。`);
    }
    return result.data;
  });
  const seen = new Set<string>();
  let previous = Number.POSITIVE_INFINITY;
  for (let index = 0; index < parsedRecords.length; index += 1) {
    const record = parsedRecords[index]!;
    if (seen.has(record.id)) throw new Error(`最近保存视图第 ${index + 1} 条与先前记录使用相同 ID。`);
    seen.add(record.id);
    const timestamp = Date.parse(record.updatedAt);
    if (!Number.isFinite(timestamp)) throw new Error(`最近保存视图第 ${index + 1} 条更新时间无法解析。`);
    if (timestamp > previous) throw new Error("最近保存视图未按更新时间降序返回。");
    previous = timestamp;
  }
  return parsedRecords;
}

function recentSavedViewErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) return "无法读取最近保存视图";
  const message = reason.message.trim();
  return message
    && message.length <= RECENT_SAVED_VIEW_ERROR_LIMIT
    && !CONTROL_CHARACTER_PATTERN.test(message)
    ? message
    : "无法读取最近保存视图";
}

export function useRecentSavedViews() {
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestVersionRef = useRef(0);

  const refresh = useCallback(() => {
    requestVersionRef.current += 1;
    setError(null);
    setLoading(true);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setError(null);
    void Promise.resolve().then(() => researchRepository.listRecentSavedViews()).then((records) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      const parsedRecords = parseRecentSavedViews(records);
      setSavedViews(parsedRecords);
    }).catch((reason: unknown) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      setError(recentSavedViewErrorMessage(reason));
    }).finally(() => {
      if (active && requestVersionRef.current === requestVersion) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refresh]);

  return { savedViews, loading, error, refresh };
}
