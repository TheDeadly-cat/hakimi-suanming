import type { LocalAppSettingsRecord } from "@hakimi/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

export type LocalAppSettings = Pick<
  LocalAppSettingsRecord,
  "defaultTimeZone" | "defaultCalendarType" | "preferredDensity"
>;

export const FALLBACK_LOCAL_APP_SETTINGS: LocalAppSettings = Object.freeze({
  defaultTimeZone: "Asia/Shanghai",
  defaultCalendarType: "gregorian",
  preferredDensity: "comfortable"
});

type LocalAppSettingsState = {
  settings: LocalAppSettings;
  ready: boolean;
};

type LocalAppSettingsProviderProps = {
  children: ReactNode;
  loadSettings?: () => Promise<LocalAppSettingsRecord | null>;
};

const LocalAppSettingsStateContext = createContext<LocalAppSettingsState>({
  settings: FALLBACK_LOCAL_APP_SETTINGS,
  ready: false
});

const LocalAppSettingsUpdateContext = createContext<(settings: LocalAppSettings) => void>(() => undefined);
const LOCAL_APP_SETTINGS_BROADCAST_CHANNEL = "hakimi-local-app-settings-v1";
const LOCAL_APP_SETTINGS_CHANGED = "LOCAL_APP_SETTINGS_CHANGED";
const LOCAL_APP_SETTINGS_STORAGE_SIGNAL = "hakimi:local-app-settings:v1:changed";
const LOCAL_APP_SETTINGS_WINDOW_EVENT = "hakimi:local-app-settings-changed";

type LocalAppSettingsSignal = {
  type: typeof LOCAL_APP_SETTINGS_CHANGED;
  changeId: string;
};

function isValidChangeId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 128
    && value === value.trim()
    && /^[a-z0-9:.-]+$/u.test(value);
}

function isSupportedTimeZone(value: unknown): value is string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 128
    || value !== value.trim()
    || !/^[A-Za-z0-9._+/-]+$/u.test(value)
  ) return false;
  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function isDefaultCalendarType(
  value: unknown
): value is LocalAppSettings["defaultCalendarType"] {
  return value === "gregorian" || value === "lunar";
}

function isPreferredDensity(value: unknown): value is LocalAppSettings["preferredDensity"] {
  return value === "comfortable" || value === "compact";
}

function normalizePreferences(value: unknown): LocalAppSettings {
  if (!value || typeof value !== "object") return { ...FALLBACK_LOCAL_APP_SETTINGS };
  const candidate = value as Record<string, unknown>;
  return {
    defaultTimeZone: isSupportedTimeZone(candidate.defaultTimeZone)
      ? candidate.defaultTimeZone
      : FALLBACK_LOCAL_APP_SETTINGS.defaultTimeZone,
    defaultCalendarType: isDefaultCalendarType(candidate.defaultCalendarType)
      ? candidate.defaultCalendarType
      : FALLBACK_LOCAL_APP_SETTINGS.defaultCalendarType,
    preferredDensity: isPreferredDensity(candidate.preferredDensity)
      ? candidate.preferredDensity
      : FALLBACK_LOCAL_APP_SETTINGS.preferredDensity
  };
}

function settingsStateAfterLoad(
  current: LocalAppSettingsState,
  settings: LocalAppSettings
): LocalAppSettingsState {
  if (
    current.ready &&
    current.settings.defaultTimeZone === settings.defaultTimeZone &&
    current.settings.defaultCalendarType === settings.defaultCalendarType &&
    current.settings.preferredDensity === settings.preferredDensity
  ) {
    return current;
  }
  return { settings, ready: true };
}

function changeIdFromSignal(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const signal = value as Partial<LocalAppSettingsSignal>;
  return signal.type === LOCAL_APP_SETTINGS_CHANGED &&
    isValidChangeId(signal.changeId)
    ? signal.changeId
    : null;
}

async function loadStoredSettings(): Promise<LocalAppSettingsRecord | null> {
  // main.tsx installs the release-specific database runtime before the app is
  // allowed to import storage. Keep this module safe to load with App itself;
  // an eager storage import would construct the singleton at its package
  // default schema and break a fresh legacy-v13 installation.
  const { caseRepository } = await import("@hakimi/storage");
  return caseRepository.readAppSettings();
}

export function LocalAppSettingsProvider({
  children,
  loadSettings = loadStoredSettings
}: LocalAppSettingsProviderProps) {
  const [state, setState] = useState<LocalAppSettingsState>({
    settings: FALLBACK_LOCAL_APP_SETTINGS,
    ready: false
  });
  const updateVersionRef = useRef(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastSignalRef = useRef<string | null>(null);
  const inFlightSignalIdsRef = useRef(new Set<string>());
  const resumeRefreshPendingRef = useRef(false);
  const signalSequenceRef = useRef(0);

  useEffect(() => {
    let active = true;
    const loadVersion = updateVersionRef.current;
    void Promise.resolve().then(loadSettings)
      .then((record) => {
        if (!active || updateVersionRef.current !== loadVersion) return;
        const settings = normalizePreferences(record);
        setState((current) => settingsStateAfterLoad(current, settings));
      })
      .catch(() => {
        if (!active || updateVersionRef.current !== loadVersion) return;
        setState((current) => settingsStateAfterLoad(current, FALLBACK_LOCAL_APP_SETTINGS));
      });
    return () => {
      active = false;
    };
  }, [loadSettings]);

  useEffect(() => {
    let active = true;
    let channel: BroadcastChannel | null = null;

    const refreshFromCanonicalStorage = (changeId: string) => {
      if (
        lastSignalRef.current === changeId
        || inFlightSignalIdsRef.current.has(changeId)
      ) return;
      inFlightSignalIdsRef.current.add(changeId);
      const loadVersion = updateVersionRef.current + 1;
      updateVersionRef.current = loadVersion;
      void Promise.resolve().then(loadSettings).then((record) => {
        inFlightSignalIdsRef.current.delete(changeId);
        if (!active || updateVersionRef.current !== loadVersion) return;
        lastSignalRef.current = changeId;
        const settings = normalizePreferences(record);
        setState((current) => settingsStateAfterLoad(current, settings));
      }).catch(() => {
        inFlightSignalIdsRef.current.delete(changeId);
        // A transient cross-tab read failure must not replace a known-good
        // preference with a guessed fallback. The same signal remains eligible
        // for retry because it is only acknowledged after a successful read.
      });
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      const changeId = changeIdFromSignal(event.data);
      if (changeId) refreshFromCanonicalStorage(changeId);
    };
    const handleWindowChange = (event: Event) => {
      const changeId = changeIdFromSignal((event as CustomEvent<unknown>).detail);
      if (changeId) refreshFromCanonicalStorage(changeId);
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== LOCAL_APP_SETTINGS_STORAGE_SIGNAL
        || !isValidChangeId(event.newValue)
      ) {
        return;
      }
      if (event.storageArea !== null) {
        let localStorage: Storage;
        try {
          localStorage = window.localStorage;
        } catch {
          return;
        }
        if (event.storageArea !== localStorage) return;
      }
      refreshFromCanonicalStorage(event.newValue);
    };

    if (typeof window.BroadcastChannel === "function") {
      try {
        channel = new window.BroadcastChannel(LOCAL_APP_SETTINGS_BROADCAST_CHANNEL);
        channel.addEventListener("message", handleMessage);
        broadcastChannelRef.current = channel;
      } catch {
        channel?.close();
        channel = null;
        broadcastChannelRef.current = null;
      }
    }
    window.addEventListener(LOCAL_APP_SETTINGS_WINDOW_EVENT, handleWindowChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      active = false;
      window.removeEventListener(LOCAL_APP_SETTINGS_WINDOW_EVENT, handleWindowChange);
      window.removeEventListener("storage", handleStorage);
      channel?.removeEventListener("message", handleMessage);
      if (broadcastChannelRef.current === channel) broadcastChannelRef.current = null;
      channel?.close();
    };
  }, [loadSettings]);

  useEffect(() => {
    let active = true;

    const refreshAfterResume = () => {
      if (
        document.visibilityState !== "visible"
        || resumeRefreshPendingRef.current
        || inFlightSignalIdsRef.current.size > 0
      ) return;
      resumeRefreshPendingRef.current = true;
      const loadVersion = updateVersionRef.current + 1;
      updateVersionRef.current = loadVersion;

      void Promise.resolve().then(loadSettings)
        .then((record) => {
          if (!active || updateVersionRef.current !== loadVersion) return;
          const settings = normalizePreferences(record);
          setState((current) => settingsStateAfterLoad(current, settings));
        })
        .catch(() => {
          // Resume reads preserve the last known-good settings on failure.
        })
        .finally(() => {
          resumeRefreshPendingRef.current = false;
        });
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshAfterResume();
    };

    document.addEventListener("visibilitychange", refreshAfterResume);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", refreshAfterResume);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [loadSettings]);

  const updateSettings = useCallback((settings: LocalAppSettings) => {
    updateVersionRef.current += 1;
    const normalizedSettings = normalizePreferences(settings);
    setState((current) => settingsStateAfterLoad(current, normalizedSettings));
    if (typeof window === "undefined") return;

    signalSequenceRef.current += 1;
    const changeId = `${Date.now().toString(36)}:${signalSequenceRef.current.toString(36)}:${Math.random()
      .toString(36)
      .slice(2)}`;
    const signal: LocalAppSettingsSignal = { type: LOCAL_APP_SETTINGS_CHANGED, changeId };
    lastSignalRef.current = changeId;

    try {
      broadcastChannelRef.current?.postMessage(signal);
    } catch {
      // The storage-event signal below remains available if the channel closes
      // between commit completion and this notification.
    }
    window.dispatchEvent(new CustomEvent(LOCAL_APP_SETTINGS_WINDOW_EVENT, { detail: signal }));
    try {
      window.localStorage.setItem(LOCAL_APP_SETTINGS_STORAGE_SIGNAL, changeId);
    } catch {
      // Local state is already current and BroadcastChannel may still have
      // notified other tabs; storage denial must not roll back committed data.
    }
  }, []);

  return (
    <LocalAppSettingsUpdateContext.Provider value={updateSettings}>
      <LocalAppSettingsStateContext.Provider value={state}>
        {children}
      </LocalAppSettingsStateContext.Provider>
    </LocalAppSettingsUpdateContext.Provider>
  );
}

export function useLocalAppSettings(): LocalAppSettingsState {
  return useContext(LocalAppSettingsStateContext);
}

export function useUpdateLocalAppSettings(): (settings: LocalAppSettings) => void {
  return useContext(LocalAppSettingsUpdateContext);
}
