import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_NAVIGATION_INTENT_EVENT,
  navigate,
  useAppLocation,
  type AppNavigationIntentDetail
} from "./router";

function navigationIntentDetail(event: Event): AppNavigationIntentDetail {
  return (event as CustomEvent<AppNavigationIntentDetail>).detail;
}

beforeEach(() => {
  window.history.replaceState({}, "", "/router-test/start");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app router navigation intent", () => {
  it("保留现有 programmatic 可取消门，拒绝时不改变 URL 或订阅 UI", () => {
    const hook = renderHook(() => useAppLocation());
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "programmatic") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      act(() => navigate("/router-test/programmatic-blocked", { scroll: false, focus: false }));
      expect(window.location.pathname).toBe("/router-test/start");
      expect(hook.result.current).toEqual({ pathname: "/router-test/start", search: "" });
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }
  });

  it("脏草稿拒绝原生 Back 后回到已接受的 URL/历史位置且 UI 不跳走", async () => {
    const hook = renderHook(() => useAppLocation());
    act(() => navigate("/router-test/accepted", { scroll: false, focus: false }));
    expect(hook.result.current).toEqual({ pathname: "/router-test/accepted", search: "" });

    const historyLength = window.history.length;
    const goSpy = vi.spyOn(window.history, "go");
    const observedIntents: AppNavigationIntentDetail[] = [];
    const blocker = (event: Event) => {
      const detail = navigationIntentDetail(event);
      observedIntents.push(detail);
      if (detail.source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      act(() => window.history.back());

      await waitFor(() => {
        expect(observedIntents).toContainEqual({
          href: `${window.location.origin}/router-test/start`,
          source: "popstate"
        });
      });
      await waitFor(() => {
        expect(window.location.pathname).toBe("/router-test/accepted");
        expect(hook.result.current).toEqual({ pathname: "/router-test/accepted", search: "" });
      }, { timeout: 1_500 });

      expect(goSpy).toHaveBeenCalledWith(1);
      expect(window.history.length).toBe(historyLength);
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }

    act(() => window.history.back());
    await waitFor(() => {
      expect(window.location.pathname).toBe("/router-test/start");
      expect(hook.result.current).toEqual({ pathname: "/router-test/start", search: "" });
    });
  });

  it("脏草稿拒绝原生 Forward 后恢复到此前接受的 URL/历史位置", async () => {
    const hook = renderHook(() => useAppLocation());
    act(() => navigate("/router-test/middle", { scroll: false, focus: false }));
    act(() => navigate("/router-test/end", { scroll: false, focus: false }));
    act(() => window.history.back());
    await waitFor(() => {
      expect(hook.result.current).toEqual({ pathname: "/router-test/middle", search: "" });
    });

    const historyLength = window.history.length;
    const goSpy = vi.spyOn(window.history, "go");
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    try {
      act(() => window.history.forward());
      await waitFor(() => expect(goSpy).toHaveBeenCalledWith(-1));
      await waitFor(() => {
        expect(window.location.pathname).toBe("/router-test/middle");
        expect(hook.result.current).toEqual({ pathname: "/router-test/middle", search: "" });
      }, { timeout: 1_500 });
      expect(window.history.length).toBe(historyLength);
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }
  });

  it("多步原生 Back 只按本会话位置恢复，不把目标路由提交给 UI", async () => {
    const hook = renderHook(() => useAppLocation());
    act(() => navigate("/router-test/one", { scroll: false, focus: false }));
    act(() => navigate("/router-test/two", { scroll: false, focus: false }));
    act(() => navigate("/router-test/three", { scroll: false, focus: false }));

    const goSpy = vi.spyOn(window.history, "go");
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    try {
      act(() => window.history.go(-2));
      await waitFor(() => expect(goSpy).toHaveBeenCalledWith(2));
      await waitFor(() => {
        expect(window.location.pathname).toBe("/router-test/three");
        expect(hook.result.current).toEqual({ pathname: "/router-test/three", search: "" });
      }, { timeout: 1_500 });
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }
  });

  it("恢复 traversal 尚未落地时最后订阅者卸载，仍同步恢复已接受 URL", () => {
    const hook = renderHook(() => useAppLocation());
    const priorState = window.history.state;
    act(() => navigate("/router-test/accepted-before-unmount", { scroll: false, focus: false }));
    const goSpy = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      window.history.replaceState(priorState, "", "/router-test/start");
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: priorState })));
      expect(goSpy).toHaveBeenCalledWith(1);
      expect(window.location.pathname).toBe("/router-test/start");
      expect(hook.result.current).toEqual({
        pathname: "/router-test/accepted-before-unmount",
        search: ""
      });

      hook.unmount();
      expect(window.location.pathname).toBe("/router-test/accepted-before-unmount");
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }
  });

  it("恢复 traversal 超时后以 replaceState 重建本会话位置，不增长或截断历史", () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useAppLocation());
    const priorState = window.history.state;
    act(() => navigate("/router-test/accepted-before-timeout", { scroll: false, focus: false }));
    const historyLength = window.history.length;
    vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      window.history.replaceState(priorState, "", "/router-test/start");
      replaceSpy.mockClear();
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: priorState })));
      expect(window.location.pathname).toBe("/router-test/start");

      act(() => vi.advanceTimersByTime(500));
      expect(window.location.pathname).toBe("/router-test/accepted-before-timeout");
      expect(hook.result.current).toEqual({
        pathname: "/router-test/accepted-before-timeout",
        search: ""
      });
      expect(replaceSpy).toHaveBeenCalledTimes(1);
      expect(window.history.length).toBe(historyLength);
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
      vi.useRealTimers();
    }
  });

  it("跨两步恢复超时后的迟到旧 session traversal 会再次 rebase，再导航仍保持单步 delta", () => {
    vi.useFakeTimers();
    const hook = renderHook(() => useAppLocation());
    const startState = window.history.state;
    act(() => navigate("/router-test/intermediate", { scroll: false, focus: false }));
    act(() => navigate("/router-test/accepted-late", { scroll: false, focus: false }));
    const oldAcceptedState = window.history.state;
    const goSpy = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      window.history.replaceState(startState, "", "/router-test/start");
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: startState })));
      expect(goSpy).toHaveBeenCalledWith(2);
      act(() => vi.advanceTimersByTime(500));
      expect(window.location.pathname).toBe("/router-test/accepted-late");

      window.history.replaceState(oldAcceptedState, "", "/router-test/accepted-late");
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: oldAcceptedState })));
      const rebasedAcceptedState = window.history.state;
      expect(hook.result.current).toEqual({ pathname: "/router-test/accepted-late", search: "" });

      act(() => navigate("/router-test/after-late", { scroll: false, focus: false }));
      goSpy.mockClear();
      window.history.replaceState(rebasedAcceptedState, "", "/router-test/accepted-late");
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: rebasedAcceptedState })));
      expect(goSpy).toHaveBeenCalledWith(1);
      expect(hook.result.current).toEqual({ pathname: "/router-test/after-late", search: "" });
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
      vi.useRealTimers();
    }
  });

  it("允许原生 Back 时同步提交 URL 与 useAppLocation", async () => {
    const hook = renderHook(() => useAppLocation());
    act(() => navigate("/router-test/next", { scroll: false, focus: false }));

    const intents: AppNavigationIntentDetail[] = [];
    const observe = (event: Event) => intents.push(navigationIntentDetail(event));
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, observe);
    try {
      act(() => window.history.back());
      await waitFor(() => {
        expect(window.location.pathname).toBe("/router-test/start");
        expect(hook.result.current).toEqual({ pathname: "/router-test/start", search: "" });
      });
      expect(intents).toContainEqual({
        href: `${window.location.origin}/router-test/start`,
        source: "popstate"
      });
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, observe);
    }
  });

  it("伪造保留 key 的外来 history state 不获可信位置，被拒绝时同步恢复 URL 与 UI", () => {
    const hook = renderHook(() => useAppLocation());
    const goSpy = vi.spyOn(window.history, "go");
    const blocker = (event: Event) => {
      if (navigationIntentDetail(event).source === "popstate") event.preventDefault();
    };
    window.addEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);

    try {
      window.history.pushState({
        foreignEntry: true,
        __hakimiAppHistoryEntryV1: {
          sessionId: "foreign-session",
          position: 1_000_000
        }
      }, "", "/router-test/foreign-entry");
      act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state })));
      expect(window.location.pathname).toBe("/router-test/start");
      expect(hook.result.current).toEqual({ pathname: "/router-test/start", search: "" });
      expect(goSpy).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(APP_NAVIGATION_INTENT_EVENT, blocker);
    }
  });
});
