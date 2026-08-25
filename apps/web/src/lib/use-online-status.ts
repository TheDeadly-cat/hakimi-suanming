import { useSyncExternalStore } from "react";

function subscribeOnlineStatus(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") onStoreChange();
  };
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  window.addEventListener("pageshow", onStoreChange);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
    window.removeEventListener("pageshow", onStoreChange);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}

function onlineSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  try {
    return navigator.onLine === true;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnlineStatus, onlineSnapshot, () => true);
}
