import { chromium, type BrowserContext, type BrowserType } from "@playwright/test";
import {
  releaseBrowserNativeDeviceOptions,
  releaseBrowserPolicyForProject
} from "../playwright.release-browser-matrix.ts";

type PersistentContextOptions = NonNullable<
  Parameters<BrowserType["launchPersistentContext"]>[1]
>;

type ReleasePersistentContextRequest = Readonly<{
  projectName: string;
  userDataDir: string;
}>;

/**
 * Launches the branded persistent browser from the frozen release policy.
 * Callers deliberately cannot provide arbitrary launch options or override the
 * policy channel/device contract.
 */
export function releasePersistentContextOptionsForProject(
  projectName: string
): PersistentContextOptions {
  const policy = releaseBrowserPolicyForProject(projectName);
  return Object.freeze({
    ...releaseBrowserNativeDeviceOptions(policy),
    channel: policy.channel,
    headless: true,
    acceptDownloads: true,
    serviceWorkers: "allow"
  });
}

export async function launchReleasePersistentContext({
  projectName,
  userDataDir
}: ReleasePersistentContextRequest): Promise<BrowserContext> {
  return chromium.launchPersistentContext(
    userDataDir,
    releasePersistentContextOptionsForProject(projectName)
  );
}

export function requireReleaseBrowserRuntimeProduct(
  projectName: string,
  product: unknown
): string {
  const policy = releaseBrowserPolicyForProject(projectName);
  const expectedBrand = policy.channel === "msedge" ? "Edg" : "Chrome";
  if (
    typeof product !== "string" ||
    !new RegExp(`^${expectedBrand}/\\d+(?:\\.\\d+)+$`, "u").test(product)
  ) {
    throw new Error(
      `Web v1 发布浏览器运行时产品不匹配：${projectName} 要求 ${expectedBrand}/<version>，实际为 ${String(product)}。`
    );
  }
  return product;
}
