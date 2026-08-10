import { useEffect, useState } from "react";
import type { SavedViewRecord } from "@hakimi/contracts";
import { researchRepository } from "@hakimi/storage";

export function useRecentSavedViews() {
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void researchRepository.listRecentSavedViews().then((records) => {
      if (active) setSavedViews(records);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法读取最近保存视图");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { savedViews, loading, error };
}
