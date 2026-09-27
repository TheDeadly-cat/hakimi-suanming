import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { closeOwnedBrowser } from "./owned-browser-shutdown";
import {
  releasePersistentContextOptionsForProject,
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context";

type Observation = Readonly<{ event: string; at: string; [key: string]: unknown }>;
type Options = Readonly<{ headless?: boolean; observe?(event: Observation): void }>;
const defaults = new Map<string, Promise<readonly string[]>>();

// Derive the installed Playwright version's defaults through its public API.
// The disposable bootstrap never opens the application or downloads a file.
function launchArguments(channel: string, headless: boolean): Promise<readonly string[]> {
  const key = channel + ":" + headless;
  let cached = defaults.get(key);
  if (!cached) {
    cached = (async () => {
      const server = await chromium.launchServer({ channel, headless, host: "127.0.0.1" });
      const child = server.process();
      const args = [...child.spawnargs];
      await server.close();
      if (child.exitCode !== 0) throw new Error("Browser argument bootstrap did not exit normally.");
      if (!args.includes("--remote-debugging-pipe")) throw new Error("Unexpected Playwright debugging transport.");
      return Object.freeze(args);
    })();
    defaults.set(key, cached);
  }
  return cached;
}

async function requireSameDirectory(directory: string, identity: { dev: bigint; ino: bigint }) {
  const current = await fs.lstat(directory, { bigint: true });
  if (!current.isDirectory() || current.isSymbolicLink()
    || current.dev !== identity.dev || current.ino !== identity.ino
    || (await fs.realpath(directory)).toLowerCase() !== directory.toLowerCase()) {
    throw new Error("Owned test profile directory identity changed.");
  }
}

/**
 * Reusable, exclusively owned profile for download/reopen regression tests.
 * Local isolation reproduced native 0xC0000005 exits in download-bubble cache
 * updates after reuse. Port transport alone did not reliably prevent them.
 * Finish the initial read-only attachment before applying Playwright's default
 * download override; keep the same owned native process across both phases.
 * Application bytes, validation, browser channel and launch protections stay fixed.
 * This is an automation compatibility path, not a production download fallback.
 */
export async function createReusableReleaseBrowser(projectName: string, options: Options = {}) {
  const base = releasePersistentContextOptionsForProject(projectName);
  const channel = base.channel!;
  const headless = options.headless ?? true;
  const temporaryRoot = await fs.realpath(os.tmpdir());
  const root = await fs.mkdtemp(path.join(temporaryRoot, "hbd-"));
  const profileDirectory = path.join(root, "profile");
  await fs.mkdir(profileDirectory);
  const rootIdentity = await fs.lstat(root, { bigint: true });
  const profileIdentity = await fs.lstat(profileDirectory, { bigint: true });
  let active = false;
  let unusable = false;
  const emit = (event: string, fields: Record<string, unknown> = {}) =>
    options.observe?.({ event, at: new Date().toISOString(), ...fields });

  async function launch(): Promise<{ context: BrowserContext; close(): Promise<void> }> {
    if (active || unusable) throw new Error("Profile is active or a prior launch did not finish safely.");
    active = true;
    let child: ChildProcess | undefined;
    let browser: Browser | undefined;
    let closeRequested = false;
    let unexpectedExit = false;
    let terminated = false;
    let exitResult: { code: number | null; signal: string | null } | undefined;
    let nativeExit: Promise<void> | undefined;
    try {
      await requireSameDirectory(root, rootIdentity);
      await requireSameDirectory(profileDirectory, profileIdentity);
      const observed = await launchArguments(channel, headless);
      const args = observed.slice(1).filter(arg => arg !== "--remote-debugging-pipe"
        && arg !== "--no-startup-window" && arg !== "about:blank" && !arg.startsWith("--user-data-dir="));
      args.push("--user-data-dir=" + profileDirectory, "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=0", "about:blank");
      const started = Date.now();
      child = spawn(observed[0]!, args, { windowsHide: headless, stdio: ["ignore", "ignore", "pipe"] });
      emit("native-launch", { executable: observed[0], args, pid: child.pid });
      const ownedChild = child;
      nativeExit = new Promise(resolve => {
        ownedChild.once("exit", (code, signal) => {
          terminated = true;
          unexpectedExit ||= !closeRequested;
          exitResult = { code, signal };
          emit("native-exit", { pid: ownedChild.pid, code, signal, closeRequested });
          resolve();
        });
        ownedChild.once("error", error => {
          terminated = true;
          unexpectedExit = true;
          emit("native-launch-error", { message: error.message });
          resolve();
        });
      });
      child.stderr?.on("data", chunk => emit("browser-stderr", { text: String(chunk) }));
      let port: number | undefined;
      for (let attempt = 0; attempt < 200; attempt++) {
        if (terminated) throw new Error("Owned browser exited before publishing its debugging port.");
        try {
          const activePortFile = path.join(profileDirectory, "DevToolsActivePort");
          const metadata = await fs.stat(activePortFile);
          if (metadata.mtimeMs >= started) {
            const value = Number((await fs.readFile(activePortFile, "utf8")).split("\n")[0]);
            if (Number.isSafeInteger(value) && value > 0 && value < 65536) { port = value; break; }
          }
        } catch { /* The owned browser has not published its port yet. */ }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!port) throw new Error("Owned browser did not publish a fresh debugging endpoint.");
      // connectOverCDP normally applies download overrides while initial pages
      // are attaching. First let the persistent profile and its initial targets
      // initialize without those overrides. Closing this CDP connection only
      // disconnects it; Browser.close below is the explicit native shutdown.
      browser = await chromium.connectOverCDP("http://127.0.0.1:" + port, { noDefaults: true });
      const initializationControl = await browser.newBrowserCDPSession();
      const initializationProcesses = await initializationControl.send("SystemInfo.getProcessInfo");
      if (!initializationProcesses.processInfo.some(item => item.type === "browser" && item.id === ownedChild.pid)) {
        throw new Error("Initialization endpoint does not identify the owned browser process.");
      }
      const initialVersion = await initializationControl.send("Browser.getVersion");
      requireReleaseBrowserRuntimeProduct(projectName, initialVersion.product);
      const initialPages = browser.contexts()[0]?.pages() ?? [];
      if (initialPages.length === 0) throw new Error("Owned browser has no initial page.");
      await Promise.all(initialPages.map(page => page.waitForLoadState("domcontentloaded")));
      emit("read-only-attach-ready", { pid: ownedChild.pid, product: initialVersion.product,
        initialPages: initialPages.length });
      await browser.close();
      if (terminated) throw new Error("Owned browser exited during initialization disconnect.");
      browser = await chromium.connectOverCDP("http://127.0.0.1:" + port);
      const control = await browser.newBrowserCDPSession();
      const processes = await control.send("SystemInfo.getProcessInfo");
      if (!processes.processInfo.some(item => item.type === "browser" && item.id === ownedChild.pid)) {
        throw new Error("Debugging endpoint does not identify the owned browser process.");
      }
      const version = await control.send("Browser.getVersion");
      requireReleaseBrowserRuntimeProduct(projectName, version.product);
      if (version.product !== initialVersion.product) throw new Error("Browser identity changed between attachments.");
      const context = browser.contexts()[0];
      if (!context) throw new Error("Owned browser has no persistent default context.");
      emit("ready", { product: version.product, pid: ownedChild.pid, headless,
        transport: "loopback-cdp-port", profileDirectory });
      context.on("close", () => {
        unexpectedExit ||= !closeRequested;
        emit("context-closed", { closeRequested });
      });
      let closed = false;
      return {
        context,
        async close() {
          if (closed) return;
          closed = true;
          closeRequested = true;
          emit("close-requested");
          try {
            await closeOwnedBrowser({
              requestClose: () => control.send("Browser.close"),
              nativeExit: nativeExit!,
              isTerminated: () => terminated,
              killOwnedProcess: () => { ownedChild.kill(); },
              disconnect: () => browser!.close(),
              protocolResult: error => emit("close-protocol-result", { message: String(error) }),
              verifyExit: () => {
                if (unexpectedExit || exitResult?.code !== 0) {
                  throw new Error("Browser exit was unexpected or nonzero: " + JSON.stringify({ unexpectedExit, ...exitResult }));
                }
              }
            });
          } catch (error) {
            unusable = true;
            throw error;
          } finally {
            active = false;
            emit("close-finished", { exit: exitResult, unusable });
          }
        }
      };
    } catch (error) {
      unusable = true;
      closeRequested = true;
      try {
        await closeOwnedBrowser({
          requestClose: async () => { if (child && !terminated) child.kill(); },
          nativeExit: nativeExit ?? Promise.resolve(),
          isTerminated: () => !child || terminated,
          killOwnedProcess: () => { child?.kill(); },
          disconnect: async () => { await browser?.close(); },
          verifyExit: () => undefined
        });
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Browser launch and cleanup failed.");
      } finally { active = false; }
      throw error;
    }
  }
  return Object.freeze({ profileDirectory, launch });
}
