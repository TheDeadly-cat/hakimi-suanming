import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve(import.meta.dirname, "../public");

describe("PWA static contract", () => {
  it("先执行无副作用的数据清点，再按结果加载普通入口或独立只读救援入口", async () => {
    const html = await readFile(path.resolve(import.meta.dirname, "../index.html"), "utf8");
    const bootstrap = await readFile(path.resolve(import.meta.dirname, "bootstrap.ts"), "utf8");
    const recoveryEntry = await readFile(path.resolve(import.meta.dirname, "recovery-main.tsx"), "utf8");

    expect(html).toContain('src="/src/bootstrap.ts"');
    expect(html).not.toContain('src="/src/main.tsx"');
    expect(bootstrap).toContain("inspectPrebootRecoveryState");
    expect(bootstrap).toContain('state.kind === "normal"');
    expect(bootstrap).toContain('import("./main")');
    expect(bootstrap).toContain('import("./recovery-main")');
    expect(bootstrap.indexOf("inspectPrebootRecoveryState")).toBeLessThan(
      bootstrap.indexOf('import("./main")')
    );
    expect(recoveryEntry).toContain("captureOrphanedV13Backup");
    expect(recoveryEntry).not.toContain('register("/sw.js"');
    expect(recoveryEntry).not.toContain("ReleaseDatabaseCoordinator");
    expect(recoveryEntry).not.toContain('import "./main"');
  });

  it("manifest 声明 standalone 与两种标准图标", async () => {
    const manifest = JSON.parse(await readFile(path.join(publicDir, "manifest.webmanifest"), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("zh-CN");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("192x192");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("512x512");
  });

  it("Service Worker 为导航提供应用壳离线回退", async () => {
    const worker = await readFile(path.join(publicDir, "sw.js"), "utf8");
    expect(worker).toContain("const BUILD_ASSETS = [];");
    expect(worker).toContain("...BUILD_ASSETS");
    expect(worker).toContain("STATIC_PATHS");
    expect(worker).toContain("clientCacheNames");
    expect(worker).toContain("matchRetainedGenerationResource");
    expect(worker).toContain("ignoreVary: true");
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('!url.pathname.startsWith("/assets/")');
    expect(worker).toContain("return fetch(event.request)");
    const confirmedShellLookup = worker.indexOf('const currentShell = await matchCurrentCache("/")');
    const navigationNetworkFetch = worker.indexOf("const response = await fetch(request)", confirmedShellLookup);
    expect(confirmedShellLookup).toBeGreaterThan(-1);
    expect(navigationNetworkFetch).toBeGreaterThan(confirmedShellLookup);
  });

  it("页面与 worker 使用同一构建号完成显式启动确认", async () => {
    const worker = await readFile(path.join(publicDir, "sw.js"), "utf8");
    const entry = await readFile(path.resolve(import.meta.dirname, "main.tsx"), "utf8");
    const app = await readFile(path.resolve(import.meta.dirname, "app.tsx"), "utf8");
    const viteConfig = await readFile(path.resolve(import.meta.dirname, "../vite.config.ts"), "utf8");

    expect(worker).toContain('message?.type !== "BOOT_OK"');
    expect(worker).toContain('message?.type === "GET_BUILD_VERSION"');
    expect(worker).toContain('type: "BUILD_VERSION"');
    expect(worker).toContain('message?.type === "ACTIVATE_INSTALLED_GENERATION"');
    expect(worker).toContain("message.buildVersion === CACHE_VERSION");
    expect(worker).toContain("bindConfirmedPreviousClient");
    expect(entry).toContain('meta[name="hakimi-build-version"]');
    expect(entry).toContain("CURRENT_RELEASE_DATABASE");
    expect(entry).toContain("dbGeneration");
    expect(entry).toContain("dbSchemaVersion");
    expect(entry).toContain("migrationReceiptDigest");
    expect(entry).toContain('type: "BOOT_OK"');
    expect(entry).toContain('.register("/sw.js", { updateViaCache: "none" })');
    expect(entry).toContain('document.readyState === "complete"');
    expect(entry).toContain("startServiceWorkerLifecycle();");
    expect(entry).toContain('window.addEventListener("load", startServiceWorkerLifecycle, { once: true })');
    expect(entry).toContain("registration.update()");
    expect(entry).toContain("activationWindowDeadline");
    expect(entry).toContain("const promoteWaiting = () =>");
    expect(entry).toContain('installing.addEventListener("statechange", promoteWhenInstalled)');
    expect(entry).toContain('currentWaiting.postMessage({ type: "ACTIVATE_INSTALLED_GENERATION" })');
    expect(entry).toContain("Date.now() + 10_000");
    expect(entry.indexOf("activationPromotionEnabled = true;")).toBeGreaterThan(
      entry.indexOf("await confirmActiveWorkerBoot();")
    );
    expect(entry).toContain("swUpdateChecked");
    expect(entry).toContain("runAppBootReadiness");
    expect(entry).toContain("verifyStorage");
    expect(entry).toContain('"candidateSets"');
    expect(entry).toContain('"knowledgeDocuments"');
    expect(entry).toContain('"sourceRights"');
    expect(entry).toContain('"citations"');
    expect(entry).toContain('"attachments"');
    expect(entry).toContain('"researcherProfiles"');
    expect(entry).toContain('"appSettings"');
    expect(entry).toContain('"ruleRegistry"');
    expect(entry).toContain('"tzdbMigrationReceipts"');
    expect(entry).toContain('"eventTimeMigrationReceipts"');
    expect(entry).toContain('"birthFingerprints"');
    expect(entry).toContain('"mutationState"');
    expect(entry).toContain("knowledgeRepository.listSourceRights()");
    expect(entry).toContain("knowledgeRepository.listCitations()");
    expect(entry).toContain("verifyCalculationCore");
    expect(entry).toContain("bootRouteKey");
    expect(entry).toContain("verifyResolvedRoute");
    expect(app).toContain("RouteReadySignal");
    expect(viteConfig).toContain('meta name="hakimi-build-version"');
    expect(viteConfig).toContain('meta name="hakimi-release-database"');
    expect(viteConfig).toContain("__RELEASE_DATABASE_DESCRIPTOR__");
    expect(viteConfig).toContain("computeOfflineCacheVersion");
    expect(viteConfig).toContain("htmlDocument: releaseAwareIndex");
    expect(viteConfig).toContain("auditBundledKnowledgeDirectory");
    expect(viteConfig).toContain("hakimi-bundled-knowledge-rights-gate");
  });
});
