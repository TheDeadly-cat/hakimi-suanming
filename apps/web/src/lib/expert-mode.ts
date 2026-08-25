import { useCallback, useEffect, useState } from "react";

export const EXPERT_MODE_KEY = "hakimi:ui-preference:v1:expert-mode";
const EXPERT_MODE_WINDOW_EVENT = "hakimi:expert-mode-changed";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;
let volatileExpertMode: boolean | null = null;

export function readExpertMode(storage: ReadableStorage): boolean {
  return storage.getItem(EXPERT_MODE_KEY) === "1";
}

export function writeExpertMode(storage: WritableStorage, enabled: boolean): void {
  if (enabled) storage.setItem(EXPERT_MODE_KEY, "1");
  else storage.removeItem(EXPERT_MODE_KEY);
}

function readBrowserExpertMode(): boolean {
  if (typeof window === "undefined") return false;
  if (volatileExpertMode !== null) return volatileExpertMode;
  try {
    return readExpertMode(window.localStorage);
  } catch {
    return false;
  }
}

/**
 * Local-only UI preference. It never enters backup payloads and only controls
 * how much raw identity/digest detail the current browser shows.
 */
export function useExpertMode(): {
  expertMode: boolean;
  setExpertMode: (enabled: boolean) => void;
} {
  const [expertMode, setExpertModeState] = useState(readBrowserExpertMode);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.storageArea !== null) {
        try {
          if (event.storageArea !== window.localStorage) return;
        } catch {
          return;
        }
      }
      if (event.key === EXPERT_MODE_KEY) {
        volatileExpertMode = null;
        setExpertModeState(event.newValue === "1");
      } else if (event.key === null) {
        volatileExpertMode = null;
        setExpertModeState(false);
      }
    };
    const syncFromCurrentWindow = (event: Event) => {
      const enabled = (event as CustomEvent<unknown>).detail;
      if (typeof enabled === "boolean") setExpertModeState(enabled);
    };
    const syncAfterResume = () => {
      if (document.visibilityState === "visible") {
        setExpertModeState(readBrowserExpertMode());
      }
    };
    const syncAfterPageShow = () => setExpertModeState(readBrowserExpertMode());
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(EXPERT_MODE_WINDOW_EVENT, syncFromCurrentWindow);
    window.addEventListener("pageshow", syncAfterPageShow);
    document.addEventListener("visibilitychange", syncAfterResume);
    setExpertModeState(readBrowserExpertMode());
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(EXPERT_MODE_WINDOW_EVENT, syncFromCurrentWindow);
      window.removeEventListener("pageshow", syncAfterPageShow);
      document.removeEventListener("visibilitychange", syncAfterResume);
    };
  }, []);

  const setExpertMode = useCallback((enabled: boolean) => {
    const nextEnabled = enabled === true;
    setExpertModeState(nextEnabled);
    if (typeof window === "undefined") return;
    try {
      writeExpertMode(window.localStorage, nextEnabled);
      volatileExpertMode = null;
    } catch {
      // Keep the current-tab display preference when persistence is denied.
      volatileExpertMode = nextEnabled;
    }
    try {
      window.dispatchEvent(new CustomEvent(EXPERT_MODE_WINDOW_EVENT, { detail: nextEnabled }));
    } catch {
      // The local state and storage result remain authoritative for this tab.
    }
  }, []);

  return { expertMode, setExpertMode };
}
