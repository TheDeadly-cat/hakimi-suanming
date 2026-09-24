import { chromium, type BrowserContext, type BrowserType } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

type OwnedProfile = { root: string; device: bigint; inode: bigint; claimed: boolean };
const ownedProfiles = new Map<string, OwnedProfile>();

function samePath(left: string, right: string): boolean {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/** Reserve a unique, short temporary profile. No caller-supplied path is accepted. */
export async function createReleasePersistentProfile(): Promise<string> {
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(temporaryRoot, "hrp-"));
  const metadata = await fs.lstat(root, { bigint: true });
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || !samePath(await fs.realpath(root), root)) {
    throw new Error("Release profile allocation crossed a link or non-directory boundary.");
  }
  // The profile itself must not exist until its one permitted launch claims it.
  const userDataDir = path.join(root, "profile");
  ownedProfiles.set(userDataDir, { root, device: metadata.dev, inode: metadata.ino, claimed: false });
  return userDataDir;
}

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
  const options = releasePersistentContextOptionsForProject(projectName);
  const owned = ownedProfiles.get(userDataDir);
  if (!owned || owned.claimed) {
    throw new Error("Release browser requires an unused profile issued by createReleasePersistentProfile.");
  }
  // Claim synchronously before any await: concurrent calls cannot share a profile.
  // Failed launches also consume it. Nothing is deleted; diagnostics stay intact.
  owned.claimed = true;
  const metadata = await fs.lstat(owned.root, { bigint: true });
  if (!metadata.isDirectory() || metadata.isSymbolicLink()
    || metadata.dev !== owned.device || metadata.ino !== owned.inode
    || !samePath(await fs.realpath(owned.root), owned.root)) {
    throw new Error("Release profile reservation identity changed before launch.");
  }
  await fs.mkdir(userDataDir, { mode: 0o700 });
  const profileMetadata = await fs.lstat(userDataDir);
  if (!profileMetadata.isDirectory() || profileMetadata.isSymbolicLink()
    || !samePath(await fs.realpath(userDataDir), userDataDir)) {
    throw new Error("Release profile directory is not the reserved temporary directory.");
  }
  return chromium.launchPersistentContext(
    userDataDir,
    options
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
