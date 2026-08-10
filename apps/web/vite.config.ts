import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { computeOfflineCacheVersion, type OfflineBundleEntry } from "./pwa-build";
import { auditBundledKnowledgeDirectory } from "./bundled-knowledge-audit";
import type { ReleaseDatabaseDescriptor } from "./release-protocol";
import { DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR } from "./vite-release-config";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const bundledKnowledgeRoot = path.resolve(workspaceRoot, "content/knowledge");
const OFFLINE_PUBLIC_ASSET_PATHS = [
  "manifest.webmanifest",
  "brand-mark.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
] as const;

interface IsolatedSystemDraft {
  packageName: string;
  root: string;
}

function isSameOrWithin(parentDirectory: string, candidatePath: string): boolean {
  const relativePath = path.relative(parentDirectory, candidatePath);
  return relativePath === ""
    || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

function isolatedSystemDrafts(): IsolatedSystemDraft[] {
  const packagesRoot = path.resolve(workspaceRoot, "packages");
  return readdirSync(packagesRoot, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const packageRoot = path.join(packagesRoot, entry.name);
    const manifestPath = path.join(packageRoot, "package.json");
    if (!existsSync(manifestPath)) return [];
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: unknown;
      private?: unknown;
      exports?: unknown;
      "x-hakimi-isolated-draft"?: {
        schemaVersion?: unknown;
        productionImport?: unknown;
      };
    };
    const hasEmptyExports = manifest.exports !== null
      && typeof manifest.exports === "object"
      && !Array.isArray(manifest.exports)
      && Object.keys(manifest.exports).length === 0;
    const metadata = manifest["x-hakimi-isolated-draft"];
    return manifest.private === true
      && typeof manifest.name === "string"
      && metadata?.schemaVersion === 1
      && metadata.productionImport === "forbidden"
      && hasEmptyExports
      ? [{ packageName: manifest.name, root: realpathSync(packageRoot) }]
      : [];
  });
}

function aliasFindMatches(find: string | RegExp, specifier: string): boolean {
  if (typeof find === "string") return specifier === find || specifier.startsWith(`${find}/`);
  find.lastIndex = 0;
  const matches = find.test(specifier);
  find.lastIndex = 0;
  return matches;
}

function aliasReplacementTouchesDraft(replacement: string, draftRoot: string): boolean {
  if (replacement.includes("\0")) return false;
  const candidate = path.isAbsolute(replacement) ? replacement : path.resolve(appRoot, replacement);
  const normalizedCandidate = existsSync(candidate) ? realpathSync(candidate) : path.resolve(candidate);
  return isSameOrWithin(draftRoot, normalizedCandidate);
}

function isolatedSystemContractDraftBoundaryPlugin(): Plugin {
  return {
    name: "hakimi-isolated-system-contract-draft-boundary",
    apply: "build",
    configResolved(config) {
      for (const draft of isolatedSystemDrafts()) {
        for (const alias of config.resolve.alias) {
          const probes = [draft.packageName, `${draft.packageName}/__boundary_probe__`];
          if (probes.some((specifier) => aliasFindMatches(alias.find, specifier))) {
            throw new Error(`Vite alias must not expose isolated system draft ${draft.packageName}`);
          }
          if (aliasReplacementTouchesDraft(alias.replacement, draft.root)) {
            throw new Error(`Vite alias must not resolve into isolated system draft ${draft.packageName}`);
          }
        }
      }
      execFileSync(
        process.execPath,
        [path.resolve(workspaceRoot, "scripts/verify-system-contract-draft-boundaries.mjs")],
        { cwd: workspaceRoot, stdio: "inherit" }
      );
    }
  };
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function releaseDatabaseMeta(descriptor: ReleaseDatabaseDescriptor): string {
  return `<meta name="hakimi-release-database" content="${escapeHtmlAttribute(JSON.stringify(descriptor))}" />`;
}

function offlineBundlePlugin(descriptor: ReleaseDatabaseDescriptor): Plugin {
  return {
    name: "hakimi-offline-bundle",
    apply: "build",
    async writeBundle(options, bundle) {
      if (!options.dir) throw new Error("PWA 构建缺少输出目录");

      const emittedFiles = Object.keys(bundle)
        .filter((fileName) => fileName !== "sw.js" && fileName !== "index.html" && !fileName.endsWith(".map"))
        .sort();
      const fingerprintBundle = Object.fromEntries(emittedFiles.map((fileName) => {
        const entry = bundle[fileName]!;
        const normalized: OfflineBundleEntry = entry.type === "chunk"
          ? { type: "chunk", code: entry.code }
          : { type: "asset", source: entry.source };
        return [fileName, normalized];
      }));
      const workerTemplate = readFileSync(path.resolve(appRoot, "public/sw.js"), "utf8");
      const publicAssets = Object.fromEntries(OFFLINE_PUBLIC_ASSET_PATHS.map((fileName) => [
        fileName,
        readFileSync(path.resolve(appRoot, "public", fileName))
      ]));

      const templatePath = path.resolve(appRoot, "public/sw.js");
      const outputPath = path.resolve(options.dir, "sw.js");
      const indexPath = path.resolve(options.dir, "index.html");
      const template = await readFile(templatePath, "utf8");
      const builtIndex = await readFile(indexPath, "utf8");
      if (!builtIndex.includes("</head>")) throw new Error("PWA 构建无法注入数据库代际描述符");
      const releaseAwareIndex = builtIndex.replace(
        "</head>",
        `  ${releaseDatabaseMeta(descriptor)}\n  </head>`
      );
      const fingerprint = computeOfflineCacheVersion({
        bundle: fingerprintBundle,
        publicAssets,
        workerTemplate,
        // 数据库代际必须进入应用壳内容指纹；即使 JS 资源图完全相同，
        // v13 bridge 与 v14 shadow 也绝不能共享一个 cache generation。
        htmlDocument: releaseAwareIndex
      });
      const buildAssets = emittedFiles.map((fileName) => `/${fileName}`);
      const worker = template
        .replace("__CACHE_VERSION__", fingerprint)
        .replace(
          '"__RELEASE_DATABASE_DESCRIPTOR__"',
          JSON.stringify(JSON.stringify(descriptor))
        )
        .replace("const BUILD_ASSETS = [];", `const BUILD_ASSETS = ${JSON.stringify(buildAssets, null, 2)};`);
      const versionedIndex = releaseAwareIndex.replace(
        "</head>",
        `  <meta name="hakimi-build-version" content="${fingerprint}" />\n  </head>`
      );

      await Promise.all([
        writeFile(outputPath, worker, "utf8"),
        writeFile(indexPath, versionedIndex, "utf8")
      ]);
    }
  };
}

function bundledKnowledgePlugin(): Plugin {
  return {
    name: "hakimi-bundled-knowledge-rights-gate",
    apply: "build",
    async buildStart() {
      const audited = await auditBundledKnowledgeDirectory(bundledKnowledgeRoot);
      for (const entry of audited.entries) {
        this.emitFile({ type: "asset", fileName: entry.outputPath, source: entry.content });
      }
    }
  };
}

export function createWebViteConfig(releaseDatabaseDescriptor: ReleaseDatabaseDescriptor) {
  return defineConfig({
    root: appRoot,
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "react": path.resolve(workspaceRoot, "node_modules/react"),
        "react-dom": path.resolve(workspaceRoot, "node_modules/react-dom"),
        "@hakimi/backup": path.resolve(workspaceRoot, "packages/backup/src/index.ts"),
        "@hakimi/contracts": path.resolve(workspaceRoot, "packages/contracts/src/index.ts"),
        "@hakimi/tzdb-core": path.resolve(workspaceRoot, "packages/tzdb-core/src/index.ts"),
        "@hakimi/integrity": path.resolve(workspaceRoot, "packages/integrity/src/index.ts"),
        "@hakimi/rule-profiles": path.resolve(workspaceRoot, "packages/rule-profiles/src/index.ts"),
        "@hakimi/bazi-core": path.resolve(workspaceRoot, "packages/bazi-core/src/index.ts"),
        "@hakimi/gold-standard/calendar-divergence-windows": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/calendar-divergence-windows.ts"
        ),
        "@hakimi/gold-standard/calendar-divergence-review": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/calendar-divergence-review.ts"
        ),
        "@hakimi/gold-standard/lunar-conversion": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/lunar-conversion.ts"
        ),
        "@hakimi/gold-standard/release-gate": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/release-gate.ts"
        ),
        "@hakimi/gold-standard/p0-03-differential": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/p0-03-differential.ts"
        ),
        "@hakimi/gold-standard/p0-03-report": path.resolve(
          workspaceRoot,
          "packages/gold-standard/src/p0-03-report.ts"
        ),
        "@hakimi/gold-standard/p0-03-summary": path.resolve(
          workspaceRoot,
          "packages/gold-standard/reports/p0-03-engineering-diagnostic-summary.v1.json"
        ),
        "@hakimi/gold-standard": path.resolve(workspaceRoot, "packages/gold-standard/src/index.ts"),
        "@hakimi/case-import": path.resolve(workspaceRoot, "packages/case-import/src/index.ts"),
        "@hakimi/luck-core": path.resolve(workspaceRoot, "packages/luck-core/src/index.ts"),
        "@hakimi/knowledge-core": path.resolve(workspaceRoot, "packages/knowledge-core/src/index.ts"),
        "@hakimi/relations-core": path.resolve(workspaceRoot, "packages/relations-core/src/index.ts"),
        "@hakimi/revision-replay": path.resolve(workspaceRoot, "packages/revision-replay/src/index.ts"),
        "@hakimi/time-core": path.resolve(workspaceRoot, "packages/time-core/src/index.ts"),
        "@hakimi/transit-core": path.resolve(workspaceRoot, "packages/transit-core/src/index.ts"),
        "@hakimi/storage": path.resolve(workspaceRoot, "packages/storage/src/index.ts"),
        "@hakimi/research-export": path.resolve(workspaceRoot, "packages/research-export/src/index.ts"),
        "@hakimi/rule-packs": path.resolve(workspaceRoot, "packages/rule-packs/src/index.ts"),
        "@hakimi/platform": path.resolve(workspaceRoot, "packages/platform/src/index.ts"),
        "@hakimi/research-query/transit-review": path.resolve(
          workspaceRoot,
          "packages/research-query/src/transit-review.ts"
        ),
        "@hakimi/research-query": path.resolve(workspaceRoot, "packages/research-query/src/index.ts")
      }
    },
    plugins: [
      isolatedSystemContractDraftBoundaryPlugin(),
      react(),
      bundledKnowledgePlugin(),
      offlineBundlePlugin(releaseDatabaseDescriptor)
    ],
    worker: {
      // Every application Worker is created with { type: "module" }. Keep the emitted
      // format aligned so Rollup may preserve shared/dynamic chunks in Worker graphs.
      // public/sw.js is copied by offlineBundlePlugin and is not affected by this setting.
      format: "es"
    },
    build: {
      outDir: path.resolve(workspaceRoot, "dist/web"),
      emptyOutDir: true,
      sourcemap: false
    }
  });
}

export default createWebViteConfig(DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR);
