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

export const FALLBACK_LOCAL_APP_SETTINGS: LocalAppSettings = {
  defaultTimeZone: "Asia/Shanghai",
  defaultCalendarType: "gregorian",
  preferredDensity: "comfortable"
};

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

function preferencesFromRecord(record: LocalAppSettingsRecord | null): LocalAppSettings {
  return record
    ? {
        defaultTimeZone: record.defaultTimeZone,
        defaultCalendarType: record.defaultCalendarType,
        preferredDensity: record.preferredDensity
      }
    : FALLBACK_LOCAL_APP_SETTINGS;
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

  useEffect(() => {
    let active = true;
    const loadVersion = updateVersionRef.current;
    void loadSettings()
      .then((record) => {
        if (!active || updateVersionRef.current !== loadVersion) return;
        setState({ settings: preferencesFromRecord(record), ready: true });
      })
      .catch(() => {
        if (!active || updateVersionRef.current !== loadVersion) return;
        setState({ settings: FALLBACK_LOCAL_APP_SETTINGS, ready: true });
      });
    return () => {
      active = false;
    };
  }, [loadSettings]);

  useEffect(() => {
    if (typeof window.BroadcastChannel !== "function") return;
    const channel = new window.BroadcastChannel(LOCAL_APP_SETTINGS_BROADCAST_CHANNEL);
    let active = true;
    broadcastChannelRef.current = channel;
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        !event.data ||
        typeof event.data !== "object" ||
        (event.data as { type?: unknown }).type !== LOCAL_APP_SETTINGS_CHANGED
      ) return;
      const loadVersion = updateVersionRef.current + 1;
      updateVersionRef.current = loadVersion;
      void loadSettings().then((record) => {
        if (!active || updateVersionRef.current !== loadVersion) return;
        setState({ settings: preferencesFromRecord(record), ready: true });
      }).catch(() => {
        // A transient cross-tab read failure must not replace a known-good
        // preference with a guessed fallback. The next committed change or
        // navigation can retry the canonical database read.
      });
    };
    channel.addEventListener("message", handleMessage);
    return () => {
      active = false;
      channel.removeEventListener("message", handleMessage);
      if (broadcastChannelRef.current === channel) broadcastChannelRef.current = null;
      channel.close();
    };
  }, [loadSettings]);

  const updateSettings = useCallback((settings: LocalAppSettings) => {
    updateVersionRef.current += 1;
    setState({ settings, ready: true });
    broadcastChannelRef.current?.postMessage({ type: LOCAL_APP_SETTINGS_CHANGED });
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
