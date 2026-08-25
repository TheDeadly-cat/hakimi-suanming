import { devices } from "@playwright/test";

export const RELEASE_BROWSER_MATRIX = Object.freeze([
  Object.freeze({
    policyId: "desktop-edge",
    projectName: "msedge",
    channel: "msedge",
    deviceName: "Desktop Edge"
  }),
  Object.freeze({
    policyId: "desktop-chrome",
    projectName: "chrome",
    channel: "chrome",
    deviceName: "Desktop Chrome"
  })
] as const);

export type ReleaseBrowserChannel = (typeof RELEASE_BROWSER_MATRIX)[number]["channel"];
export type ReleaseBrowserPolicy = (typeof RELEASE_BROWSER_MATRIX)[number];

export const DEFAULT_V13_RELEASE_BROWSER_IDENTITY = Object.freeze({
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
} as const);

type ReleaseBrowserScreen = Readonly<{
  width: number;
  height: number;
}>;

function releaseBrowserScreen(descriptor: object): ReleaseBrowserScreen | null {
  const value: unknown = Reflect.get(descriptor, "screen");
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const width: unknown = Reflect.get(value, "width");
  const height: unknown = Reflect.get(value, "height");
  if (
    typeof width !== "number"
    || !Number.isSafeInteger(width)
    || width <= 0
    || typeof height !== "number"
    || !Number.isSafeInteger(height)
    || height <= 0
  ) return null;
  return Object.freeze({ width, height });
}

/**
 * Keep the real branded browser user agent. Playwright's desktop device
 * descriptors pin a synthetic package-version UA, so only the neutral desktop
 * geometry/capability fields are admitted to release contexts.
 */
export function releaseBrowserNativeDeviceOptions(policy: ReleaseBrowserPolicy) {
  const descriptor = devices[policy.deviceName];
  if (!descriptor?.viewport) {
    throw new Error(`Web v1 发布浏览器设备描述不完整：${policy.deviceName}`);
  }
  const screen = releaseBrowserScreen(descriptor);
  if (!screen) throw new Error(`Web v1 发布浏览器屏幕描述不完整：${policy.deviceName}`);
  return Object.freeze({
    viewport: Object.freeze({ ...descriptor.viewport }),
    screen,
    deviceScaleFactor: descriptor.deviceScaleFactor,
    isMobile: descriptor.isMobile,
    hasTouch: descriptor.hasTouch
  });
}

export function releaseBrowserPolicyForProject(projectName: string): ReleaseBrowserPolicy {
  const browser = RELEASE_BROWSER_MATRIX.find((entry) => entry.projectName === projectName);
  if (!browser) throw new Error(`不支持的 Web v1 发布浏览器项目：${projectName}`);
  return browser;
}

export function releaseBrowserChannelForProject(projectName: string): ReleaseBrowserChannel {
  return releaseBrowserPolicyForProject(projectName).channel;
}
