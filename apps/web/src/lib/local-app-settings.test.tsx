import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  SCHEMA_VERSION,
  type LocalAppSettingsRecord
} from "@hakimi/contracts";
import {
  LocalAppSettingsProvider,
  useLocalAppSettings,
  useUpdateLocalAppSettings,
  type LocalAppSettings
} from "./local-app-settings";

class FakeBroadcastChannel {
  static readonly open = new Set<FakeBroadcastChannel>();
  readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(readonly name: string) {
    FakeBroadcastChannel.open.add(this);
  }

  postMessage(data: unknown) {
    for (const channel of FakeBroadcastChannel.open) {
      if (channel === this || channel.name !== this.name) continue;
      queueMicrotask(() => {
        for (const listener of channel.listeners) listener({ data } as MessageEvent<unknown>);
      });
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    if (type === "message") this.listeners.delete(listener);
  }

  close() {
    FakeBroadcastChannel.open.delete(this);
    this.listeners.clear();
  }
}

const comfortable: LocalAppSettingsRecord = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
  recordType: "local_app_settings",
  id: LOCAL_APP_SETTINGS_ID,
  locale: "zh-CN",
  defaultTimeZone: "Asia/Shanghai",
  defaultCalendarType: "gregorian",
  preferredDensity: "comfortable",
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z"
};

const compact: LocalAppSettings = {
  defaultTimeZone: "America/New_York",
  defaultCalendarType: "lunar",
  preferredDensity: "compact"
};

function Probe({ name, commit }: { name: string; commit?: () => void }) {
  const { settings, ready } = useLocalAppSettings();
  const update = useUpdateLocalAppSettings();
  return (
    <section>
      <output aria-label={name}>{ready ? `${settings.preferredDensity}/${settings.defaultTimeZone}` : "loading"}</output>
      {commit ? <button type="button" onClick={() => { commit(); update(compact); }}>commit</button> : null}
    </section>
  );
}

afterEach(() => {
  FakeBroadcastChannel.open.clear();
  Reflect.deleteProperty(window, "BroadcastChannel");
});

describe("LocalAppSettingsProvider", () => {
  it("重新读取另一标签已提交的本机偏好", async () => {
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      value: FakeBroadcastChannel as unknown as typeof BroadcastChannel
    });
    let stored: LocalAppSettingsRecord = comfortable;
    const loadFirst = vi.fn(async () => stored);
    const loadSecond = vi.fn(async () => stored);
    render(
      <>
        <LocalAppSettingsProvider loadSettings={loadFirst}>
          <Probe name="first" commit={() => { stored = { ...comfortable, ...compact }; }} />
        </LocalAppSettingsProvider>
        <LocalAppSettingsProvider loadSettings={loadSecond}>
          <Probe name="second" />
        </LocalAppSettingsProvider>
      </>
    );

    await waitFor(() => expect(screen.getByLabelText("second").textContent).toBe("comfortable/Asia/Shanghai"));
    fireEvent.click(screen.getByRole("button", { name: "commit" }));

    await waitFor(() => expect(screen.getByLabelText("second").textContent).toBe("compact/America/New_York"));
    expect(loadSecond).toHaveBeenCalledTimes(2);
  });
});
