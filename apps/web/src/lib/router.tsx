import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

export type AppLocation = {
  pathname: string;
  search: string;
};

export type NavigationOptions = {
  replace?: boolean;
  scroll?: boolean;
  focus?: boolean;
};

export const APP_NAVIGATION_INTENT_EVENT = "hakimi:app-navigation-intent";

export interface AppNavigationIntentDetail {
  href: string;
  source: "programmatic" | "link" | "popstate";
}

const APP_HISTORY_ENTRY_KEY = "__hakimiAppHistoryEntryV1";
const BLOCKED_POPSTATE_RESTORE_TIMEOUT_MS = 500;

function createHistorySessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface AcceptedHistoryEntry {
  href: string;
  location: AppLocation;
  position: number | null;
  state: unknown;
}

interface PendingPopStateRestore {
  expectedHref: string;
  expectedPosition: number | null;
  timeoutId: number;
}

let navigationEffectSequence = 0;
let cancelScheduledNavigationEffects: (() => void) | null = null;
let appHistorySessionId = createHistorySessionId();
let nextHistoryPosition = 0;
let acceptedHistoryEntry: AcceptedHistoryEntry | null = null;
let pendingPopStateRestore: PendingPopStateRestore | null = null;
const appLocationSubscribers = new Set<(location: AppLocation) => void>();

export function getAppLocation(): AppLocation {
  return { pathname: window.location.pathname, search: window.location.search };
}

function resolveHttpNavigationTarget(to: string, baseHref: string): URL {
  let target: URL;
  try {
    target = new URL(to, baseHref);
  } catch {
    throw new TypeError("Invalid app navigation URL.");
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new TypeError(`Unsupported app navigation protocol: ${target.protocol}`);
  }
  if (target.username || target.password) {
    throw new TypeError("Credential-bearing app navigation URLs are not supported.");
  }
  return target;
}

function tryResolveHttpNavigationTarget(to: string, baseHref: string): URL | null {
  try {
    return resolveHttpNavigationTarget(to, baseHref);
  } catch {
    return null;
  }
}

function dispatchAppNavigationIntent(
  target: URL,
  source: AppNavigationIntentDetail["source"]
): boolean {
  return window.dispatchEvent(new CustomEvent<AppNavigationIntentDetail>(APP_NAVIGATION_INTENT_EVENT, {
    cancelable: true,
    detail: { href: target.href, source }
  }));
}

function isTextFragmentTarget(target: URL): boolean {
  return target.hash.includes(":~:text=");
}

function appNavigationIntentAllowed(target: URL, source: AppNavigationIntentDetail["source"]): boolean {
  const changesRouteOrDocument = target.origin !== window.location.origin
    || target.pathname !== window.location.pathname
    || target.search !== window.location.search
    || isTextFragmentTarget(target);
  if (!changesRouteOrDocument) return true;
  return dispatchAppNavigationIntent(target, source);
}

function readHistoryPosition(state: unknown): number | null {
  if (typeof state !== "object" || state === null || Array.isArray(state)) return null;
  const marker = (state as Record<string, unknown>)[APP_HISTORY_ENTRY_KEY];
  if (typeof marker !== "object" || marker === null || Array.isArray(marker)) return null;
  const markerRecord = marker as Record<string, unknown>;
  if (markerRecord.sessionId !== appHistorySessionId) return null;
  const position = markerRecord.position;
  return Number.isSafeInteger(position) && (position as number) >= 0
    ? position as number
    : null;
}

function historyStateWithPosition(state: unknown, position: number): Record<string, unknown> {
  const statePrototype = typeof state === "object" && state !== null
    ? Object.getPrototypeOf(state) as unknown
    : undefined;
  if (statePrototype === Object.prototype || statePrototype === null) {
    return {
      ...(state as Record<string, unknown>),
      [APP_HISTORY_ENTRY_KEY]: { sessionId: appHistorySessionId, position }
    };
  }
  return {
    [APP_HISTORY_ENTRY_KEY]: { sessionId: appHistorySessionId, position },
    __hakimiPreviousHistoryState: state
  };
}

function rebaseCurrentHistoryEntry(entry: AcceptedHistoryEntry): AcceptedHistoryEntry {
  appHistorySessionId = createHistorySessionId();
  nextHistoryPosition = 1;
  const state = historyStateWithPosition(entry.state, 0);
  window.history.replaceState(state, "", entry.href);
  return {
    ...entry,
    position: 0,
    state
  };
}

function captureCurrentHistoryEntry(ensurePosition: boolean): AcceptedHistoryEntry {
  let state: unknown = window.history.state;
  let position = readHistoryPosition(state);
  if (position === null && ensurePosition) {
    return rebaseCurrentHistoryEntry({
      href: window.location.href,
      location: getAppLocation(),
      position: null,
      state
    });
  } else if (position !== null) {
    nextHistoryPosition = Math.max(nextHistoryPosition, position + 1);
  }
  return {
    href: window.location.href,
    location: getAppLocation(),
    position,
    state
  };
}

function clearPendingPopStateRestore(): void {
  if (!pendingPopStateRestore) return;
  window.clearTimeout(pendingPopStateRestore.timeoutId);
  pendingPopStateRestore = null;
}

function notifyAppLocationSubscribers(location: AppLocation): void {
  appLocationSubscribers.forEach((subscriber) => subscriber(location));
}

function restoreAcceptedEntryWithReplacement(): void {
  const accepted = acceptedHistoryEntry;
  if (!accepted) return;
  clearPendingPopStateRestore();
  // Fail-safe fallback: replace the rejected physical history entry with the
  // last accepted URL. This preserves length and URL/UI agreement, but it
  // intentionally sacrifices that rejected entry's prior contents.
  acceptedHistoryEntry = rebaseCurrentHistoryEntry(accepted);
  notifyAppLocationSubscribers(acceptedHistoryEntry.location);
}

function restoreBlockedPopState(target: AcceptedHistoryEntry): void {
  const accepted = acceptedHistoryEntry;
  if (!accepted) return;
  const canTraverseBackToAccepted = accepted.position !== null
    && target.position !== null
    && accepted.position !== target.position;
  if (!canTraverseBackToAccepted) {
    restoreAcceptedEntryWithReplacement();
    return;
  }

  const delta = accepted.position! - target.position!;
  clearPendingPopStateRestore();
  const timeoutId = window.setTimeout(() => {
    const pending = pendingPopStateRestore;
    if (!pending || pending.expectedHref !== accepted.href || pending.expectedPosition !== accepted.position) return;
    restoreAcceptedEntryWithReplacement();
  }, BLOCKED_POPSTATE_RESTORE_TIMEOUT_MS);
  pendingPopStateRestore = {
    expectedHref: accepted.href,
    expectedPosition: accepted.position,
    timeoutId
  };
  try {
    window.history.go(delta);
  } catch {
    restoreAcceptedEntryWithReplacement();
  }
}

function handleAppPopState(): void {
  const target = captureCurrentHistoryEntry(false);
  const accepted = acceptedHistoryEntry;
  if (!accepted) {
    acceptedHistoryEntry = target;
    notifyAppLocationSubscribers(target.location);
    return;
  }

  if (pendingPopStateRestore) {
    const reachedAcceptedEntry = target.href === pendingPopStateRestore.expectedHref
      && (
        pendingPopStateRestore.expectedPosition === null
        || target.position === pendingPopStateRestore.expectedPosition
      );
    if (reachedAcceptedEntry) {
      clearPendingPopStateRestore();
      acceptedHistoryEntry = target;
      notifyAppLocationSubscribers(target.location);
    } else {
      restoreAcceptedEntryWithReplacement();
    }
    return;
  }

  if (target.href === accepted.href) {
    acceptedHistoryEntry = target.position === null
      ? rebaseCurrentHistoryEntry(target)
      : target;
    notifyAppLocationSubscribers(acceptedHistoryEntry.location);
    return;
  }

  const targetUrl = resolveHttpNavigationTarget(target.href, accepted.href);
  if (!dispatchAppNavigationIntent(targetUrl, "popstate")) {
    restoreBlockedPopState(target);
    return;
  }

  acceptedHistoryEntry = target.position === null
    ? rebaseCurrentHistoryEntry(target)
    : target;
  notifyAppLocationSubscribers(acceptedHistoryEntry.location);
}

function subscribeToAppLocation(subscriber: (location: AppLocation) => void): () => void {
  if (appLocationSubscribers.size === 0) {
    clearPendingPopStateRestore();
    acceptedHistoryEntry = captureCurrentHistoryEntry(true);
    window.addEventListener("popstate", handleAppPopState);
  }
  appLocationSubscribers.add(subscriber);
  if (acceptedHistoryEntry) subscriber(acceptedHistoryEntry.location);
  return () => {
    appLocationSubscribers.delete(subscriber);
    if (appLocationSubscribers.size !== 0) return;
    if (pendingPopStateRestore) restoreAcceptedEntryWithReplacement();
    window.removeEventListener("popstate", handleAppPopState);
    clearPendingPopStateRestore();
    acceptedHistoryEntry = null;
  };
}

function ensureAcceptedHistoryEntry(): AcceptedHistoryEntry {
  if (acceptedHistoryEntry && appLocationSubscribers.size > 0) {
    if (acceptedHistoryEntry.position === null) {
      acceptedHistoryEntry = rebaseCurrentHistoryEntry(acceptedHistoryEntry);
    }
    return acceptedHistoryEntry;
  }
  acceptedHistoryEntry = captureCurrentHistoryEntry(true);
  return acceptedHistoryEntry;
}

function findNavigationHashTarget(target: URL): HTMLElement | null {
  if (!target.hash || target.hash === "#" || isTextFragmentTarget(target)) return null;
  let anchorName = target.hash.slice(1);
  try {
    anchorName = decodeURIComponent(anchorName);
  } catch {
    // Keep the literal fragment when it is not valid percent-encoded text.
  }
  const byId = document.getElementById(anchorName);
  if (byId) return byId;
  const byName = document.getElementsByName(anchorName)[0];
  return byName instanceof HTMLElement ? byName : null;
}

function scrollToNavigationTarget(target: URL): void {
  if (!target.hash || target.hash === "#") {
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const anchor = findNavigationHashTarget(target);
  if (anchor) anchor.scrollIntoView({ block: "start" });
  else window.scrollTo({ top: 0, behavior: "auto" });
}

function focusNavigationTarget(navigationTarget: URL): void {
  const target =
    findNavigationHashTarget(navigationTarget) ??
    document.querySelector<HTMLElement>("[data-route-focus-target]") ??
    document.querySelector<HTMLElement>("main h1") ??
    document.querySelector<HTMLElement>("main");
  if (!target) return;

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.focus({ preventScroll: true });
}

function scheduleNavigationEffects(target: URL, options?: NavigationOptions): void {
  const sequence = ++navigationEffectSequence;
  cancelScheduledNavigationEffects?.();
  if (options?.scroll === false && options.focus === false) return;

  const frameIds = new Set<number>();
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  const cleanup = () => {
    observer?.disconnect();
    observer = null;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    timeoutId = null;
    frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    frameIds.clear();
    if (cancelScheduledNavigationEffects === cleanup) cancelScheduledNavigationEffects = null;
  };
  cancelScheduledNavigationEffects = cleanup;

  const finish = (force = false): boolean => {
    if (sequence !== navigationEffectSequence) {
      cleanup();
      return true;
    }
    if (!force && document.querySelector('[data-route-state="loading"]')) return false;
    if (options?.scroll !== false) scrollToNavigationTarget(target);
    if (options?.focus !== false) focusNavigationTarget(target);
    cleanup();
    return true;
  };

  const requestFrame = (callback: () => void) => {
    const frameId = window.requestAnimationFrame(() => {
      frameIds.delete(frameId);
      callback();
    });
    frameIds.add(frameId);
  };

  requestFrame(() => requestFrame(() => {
    if (finish()) return;
    if (typeof MutationObserver !== "undefined" && document.body) {
      observer = new MutationObserver(() => { void finish(); });
      observer.observe(document.body, { childList: true, subtree: true });
      if (finish()) return;
    }
    timeoutId = window.setTimeout(() => { void finish(true); }, 4_000);
  }));
}

export function navigate(to: string, options?: NavigationOptions): void {
  const target = resolveHttpNavigationTarget(to, window.location.href);
  if (!appNavigationIntentAllowed(target, "programmatic")) return;
  if (target.origin !== window.location.origin) {
    if (options?.replace) window.location.replace(target.href);
    else window.location.assign(target.href);
    return;
  }
  if (isTextFragmentTarget(target)) {
    if (options?.replace) window.location.replace(target.href);
    else window.location.assign(target.href);
    return;
  }

  const historyTarget = `${target.pathname}${target.search}${target.hash}`;
  const currentHistoryTarget = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (historyTarget === currentHistoryTarget) {
    if (options?.replace) {
      const accepted = ensureAcceptedHistoryEntry();
      const position = accepted.position ?? nextHistoryPosition++;
      const state = historyStateWithPosition(window.history.state, position);
      window.history.replaceState(state, "", historyTarget);
      acceptedHistoryEntry = captureCurrentHistoryEntry(false);
    }
    scheduleNavigationEffects(target, options);
    return;
  }
  const accepted = ensureAcceptedHistoryEntry();
  const position = options?.replace
    ? accepted.position ?? nextHistoryPosition++
    : accepted.position === null
      ? nextHistoryPosition++
      : accepted.position + 1;
  nextHistoryPosition = Math.max(nextHistoryPosition, position + 1);
  const state = historyStateWithPosition(options?.replace ? window.history.state : {}, position);
  if (options?.replace) window.history.replaceState(state, "", historyTarget);
  else window.history.pushState(state, "", historyTarget);
  acceptedHistoryEntry = captureCurrentHistoryEntry(false);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  scheduleNavigationEffects(target, options);
}

export function useAppLocation(): AppLocation {
  const [location, setLocation] = useState(getAppLocation);
  useEffect(() => subscribeToAppLocation(setLocation), []);
  return location;
}

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  navigationOptions?: NavigationOptions;
};

export function AppLink({ href, children, navigationOptions, onClick, ...props }: AppLinkProps) {
  const baseHref = typeof window === "undefined" ? "https://app.invalid/" : window.location.href;
  const resolvedTarget = tryResolveHttpNavigationTarget(href, baseHref);
  const navigationKind = !resolvedTarget
    ? "blocked"
    : typeof window === "undefined"
      ? "unresolved"
      : resolvedTarget.origin === window.location.origin
        ? "internal"
        : "external";
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!resolvedTarget) {
      event.preventDefault();
      return;
    }
    const targetName = props.target?.toLowerCase();
    const downloadsFile = props.download !== undefined && props.download !== false;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      downloadsFile ||
      (targetName !== undefined && targetName !== "_self")
    ) {
      return;
    }
    const target = resolvedTarget;
    if (target.origin !== window.location.origin || isTextFragmentTarget(target)) {
      if (!appNavigationIntentAllowed(target, "link")) event.preventDefault();
      return;
    }
    if (
      target.hash &&
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    ) {
      return;
    }
    event.preventDefault();
    navigate(`${target.pathname}${target.search}${target.hash}`, navigationOptions);
  };

  return (
    <a
      {...props}
      href={resolvedTarget ? href : undefined}
      onClick={handleClick}
      aria-disabled={resolvedTarget ? props["aria-disabled"] : true}
      data-navigation-integrity={resolvedTarget ? "validated" : "blocked"}
      data-navigation-kind={navigationKind}
    >
      {children}
    </a>
  );
}
