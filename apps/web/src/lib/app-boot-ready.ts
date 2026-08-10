import { useEffect, useState } from "react";

const APP_BOOT_READY_EVENT = "hakimi:app-boot-ready";

export function isAppBootReady(): boolean {
  return document.documentElement.dataset.appBootReady === "true";
}

export function setAppBootReadyState(ready: boolean): void {
  document.documentElement.dataset.appBootReady = String(ready);
  window.dispatchEvent(new Event(APP_BOOT_READY_EVENT));
}

export function useAppBootReady(): boolean {
  const [ready, setReady] = useState(isAppBootReady);

  useEffect(() => {
    const sync = () => setReady(isAppBootReady());
    window.addEventListener(APP_BOOT_READY_EVENT, sync);
    sync();
    return () => window.removeEventListener(APP_BOOT_READY_EVENT, sync);
  }, []);

  return ready;
}
