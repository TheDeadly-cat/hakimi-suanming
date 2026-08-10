import { useCallback, useEffect, useState } from "react";

export const EXPERT_MODE_KEY = "hakimi:ui-preference:v1:expert-mode";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

export function readExpertMode(storage: ReadableStorage): boolean {
  return storage.getItem(EXPERT_MODE_KEY) === "1";
}

export function writeExpertMode(storage: WritableStorage, enabled: boolean): void {
  if (enabled) storage.setItem(EXPERT_MODE_KEY, "1");
  else storage.removeItem(EXPERT_MODE_KEY);
}

/**
 * Local-only UI preference. It never enters backup payloads and only controls
 * how much raw identity/digest detail the current browser shows.
 */
export function useExpertMode(): {
  expertMode: boolean;
  setExpertMode: (enabled: boolean) => void;
} {
  const [expertMode, setExpertModeState] = useState(false);

  useEffect(() => {
    setExpertModeState(readExpertMode(window.localStorage));
  }, []);

  const setExpertMode = useCallback((enabled: boolean) => {
    setExpertModeState(enabled);
    writeExpertMode(window.localStorage, enabled);
  }, []);

  return { expertMode, setExpertMode };
}
