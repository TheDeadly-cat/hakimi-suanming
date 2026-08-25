import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPERT_MODE_KEY,
  readExpertMode,
  useExpertMode,
  writeExpertMode
} from "./expert-mode";

const EXPERT_MODE_WINDOW_EVENT = "hakimi:expert-mode-changed";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    values
  };
}

function dispatchStorageEvent(init: StorageEventInit): void {
  window.dispatchEvent(new StorageEvent("storage", init));
}

function resetBrowserExpertModeState(): void {
  window.localStorage.clear();
  window.sessionStorage.clear();
  const hook = renderHook(() => useExpertMode());
  act(() => dispatchStorageEvent({
    key: null,
    newValue: null,
    storageArea: window.localStorage
  }));
  hook.unmount();
}

beforeEach(() => resetBrowserExpertModeState());

afterEach(() => {
  vi.restoreAllMocks();
  resetBrowserExpertModeState();
});

describe("expert mode preference", () => {
  it("默认关闭，写入后开启，写 false 时清除", () => {
    const storage = memoryStorage();
    expect(readExpertMode(storage)).toBe(false);

    writeExpertMode(storage, true);
    expect(storage.values.get(EXPERT_MODE_KEY)).toBe("1");
    expect(readExpertMode(storage)).toBe(true);

    writeExpertMode(storage, false);
    expect(storage.values.has(EXPERT_MODE_KEY)).toBe(false);
    expect(readExpertMode(storage)).toBe(false);
  });

  it("拒绝损坏值，不把任意字符串当作开启", () => {
    const storage = memoryStorage();
    storage.setItem(EXPERT_MODE_KEY, "yes");
    expect(readExpertMode(storage)).toBe(false);
  });

  it("通过同窗口 CustomEvent 同步所有已挂载 hook", () => {
    const first = renderHook(() => useExpertMode());
    const second = renderHook(() => useExpertMode());

    act(() => first.result.current.setExpertMode(true));
    expect(first.result.current.expertMode).toBe(true);
    expect(second.result.current.expertMode).toBe(true);

    act(() => second.result.current.setExpertMode(false));
    expect(first.result.current.expertMode).toBe(false);
    expect(second.result.current.expertMode).toBe(false);
  });

  it("只接收目标 localStorage/key 的真实 StorageEvent，并按 newValue 与 clear 同步", () => {
    const hook = renderHook(() => useExpertMode());

    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: "1",
      storageArea: window.sessionStorage
    }));
    expect(hook.result.current.expertMode).toBe(false);

    act(() => dispatchStorageEvent({
      key: "hakimi:unrelated",
      newValue: "1",
      storageArea: window.localStorage
    }));
    expect(hook.result.current.expertMode).toBe(false);

    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: "1",
      storageArea: window.localStorage
    }));
    expect(hook.result.current.expertMode).toBe(true);

    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: "0",
      storageArea: window.localStorage
    }));
    expect(hook.result.current.expertMode).toBe(false);

    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: "1",
      storageArea: window.localStorage
    }));
    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: null,
      storageArea: window.localStorage
    }));
    expect(hook.result.current.expertMode).toBe(false);

    act(() => dispatchStorageEvent({
      key: EXPERT_MODE_KEY,
      newValue: "1",
      storageArea: window.localStorage
    }));
    act(() => dispatchStorageEvent({
      key: null,
      newValue: null,
      storageArea: window.localStorage
    }));
    expect(hook.result.current.expertMode).toBe(false);
  });

  it("在 pageshow 时重新读取当前 localStorage", () => {
    const hook = renderHook(() => useExpertMode());
    window.localStorage.setItem(EXPERT_MODE_KEY, "1");

    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(hook.result.current.expertMode).toBe(true);

    window.localStorage.removeItem(EXPERT_MODE_KEY);
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(hook.result.current.expertMode).toBe(false);
  });

  it("只在 document 重新 visible 时同步当前 localStorage", () => {
    let visibilityState: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilityState);
    const hook = renderHook(() => useExpertMode());
    window.localStorage.setItem(EXPERT_MODE_KEY, "1");

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(hook.result.current.expertMode).toBe(false);

    visibilityState = "visible";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(hook.result.current.expertMode).toBe(true);

    window.localStorage.removeItem(EXPERT_MODE_KEY);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(hook.result.current.expertMode).toBe(false);
  });

  it("unmount 时用相同监听器清理 storage、CustomEvent、pageshow 与 visibilitychange", () => {
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const hook = renderHook(() => useExpertMode());

    const windowRegistrations = ["storage", EXPERT_MODE_WINDOW_EVENT, "pageshow"].map((type) => {
      const registration = addWindowListener.mock.calls.find(([registeredType]) => registeredType === type);
      expect(registration).toBeDefined();
      return [type, registration![1]] as const;
    });
    const visibilityRegistration = addDocumentListener.mock.calls.find(
      ([registeredType]) => registeredType === "visibilitychange"
    );
    expect(visibilityRegistration).toBeDefined();

    hook.unmount();

    for (const [type, listener] of windowRegistrations) {
      expect(removeWindowListener).toHaveBeenCalledWith(type, listener);
    }
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      visibilityRegistration![1]
    );
  });

  it("localStorage.getItem 抛错时以关闭状态挂载且恢复事件不抛", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    const mount = () => renderHook(() => useExpertMode());
    expect(mount).not.toThrow();
    const hook = mount();
    expect(hook.result.current.expertMode).toBe(false);
    expect(() => act(() => window.dispatchEvent(new Event("pageshow")))).not.toThrow();
    expect(hook.result.current.expertMode).toBe(false);
  });

  it("localStorage.setItem 抛错时 setter 不抛并为 current-tab 保留 volatile true", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "QuotaExceededError");
    });
    const first = renderHook(() => useExpertMode());

    expect(() => act(() => first.result.current.setExpertMode(true))).not.toThrow();
    expect(first.result.current.expertMode).toBe(true);
    expect(window.localStorage.getItem(EXPERT_MODE_KEY)).toBeNull();

    const second = renderHook(() => useExpertMode());
    expect(second.result.current.expertMode).toBe(true);
  });

  it("localStorage.removeItem 抛错时 setter 不抛并让 volatile false 覆盖陈旧持久值", () => {
    window.localStorage.setItem(EXPERT_MODE_KEY, "1");
    const first = renderHook(() => useExpertMode());
    expect(first.result.current.expertMode).toBe(true);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => act(() => first.result.current.setExpertMode(false))).not.toThrow();
    expect(first.result.current.expertMode).toBe(false);
    expect(window.localStorage.getItem(EXPERT_MODE_KEY)).toBe("1");

    const second = renderHook(() => useExpertMode());
    expect(second.result.current.expertMode).toBe(false);
  });
});
