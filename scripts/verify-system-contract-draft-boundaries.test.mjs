import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadConfigFromFile, resolveConfig } from "vite";
import { verifySystemContractDraftBoundaries } from "./verify-system-contract-draft-boundaries.mjs";

const temporaryRoots = [];
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftRegistry = JSON.parse(fs.readFileSync(path.join(
  workspaceRoot,
  "scripts/system-contract-draft-registry.json"
), "utf8"));
const draftPackages = draftRegistry.drafts.filter((draft) => draft.presence === "required");
const plannedFortelDraft = draftRegistry.drafts.find((draft) =>
  draft.packageName === "@hakimi/ziwei-fortel-differential-draft"
);
const plannedWesternAstronomyDraft = draftRegistry.drafts.find((draft) =>
  draft.packageName === "@hakimi/western-astronomy-engine-adapter-draft"
);
const plannedZiweiWorkspaceDraft = draftRegistry.drafts.find((draft) =>
  draft.packageName === "@hakimi/ziwei-workspace-artifact-draft"
);
const plannedWesternRulesPreviewDraft = draftRegistry.drafts.find((draft) =>
  draft.packageName === "@hakimi/western-astrology-rules-preview-draft"
);
const frozenIztroClosure = JSON.parse(fs.readFileSync(path.join(
  workspaceRoot,
  "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json"
), "utf8"));
const frozenAstronomyEngineClosure = JSON.parse(fs.readFileSync(path.join(
  workspaceRoot,
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json"
), "utf8"));

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function allowedDraftDependencies(draft) {
  return [...new Set(draft.crossDraftEdges.map((edge) => edge.toPackage))].sort();
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hakimi-draft-boundary-"));
  temporaryRoots.push(root);
  write(root, "package.json", json({
    name: "boundary-fixture",
    version: "1.0.0",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    overrides: frozenIztroClosure.rootOverrides
  }));
  const lockPackages = {
    "": { name: "boundary-fixture", version: "1.0.0", workspaces: ["apps/*", "packages/*"] }
  };
  for (const draft of draftPackages) {
    const manifest = {
      name: draft.packageName,
      version: "0.0.0-draft.0",
      private: true,
      type: "module",
      exports: {},
      "x-hakimi-isolated-draft": {
        schemaVersion: 1,
        kind: draft.kind,
        systemId: draft.systemId,
        productionImport: "forbidden",
        allowedDraftDependencies: allowedDraftDependencies(draft)
      },
      dependencies: draft.dependencies
    };
    write(root, `packages/${draft.directoryName}/package.json`, json(manifest));
    if (draft.specialChecks.includes("iztro-browser-preview-v1")) {
      write(root, `packages/${draft.directoryName}/src/contract-bridge.ts`, "export * from \"../../ziwei-doushu-contracts-draft/src/index.ts\";\n");
      write(root, `packages/${draft.directoryName}/src/index.ts`, "import { Worker } from \"node:worker_threads\";\nexport { Worker };\nexport * from \"./contract-bridge.ts\";\n");
      write(root, `packages/${draft.directoryName}/src/node-worker-entry.mjs`, [
        "import { createRequire } from \"node:module\";",
        "import { parentPort } from \"node:worker_threads\";",
        "import { astro } from \"iztro\";",
        "const require = createRequire(import.meta.url);",
        "const { setLanguage } = require(\"iztro/lib/i18n\");",
        "const zhCnStars = require(\"iztro/lib/i18n/locales/zh-CN/star\");",
        "void require.resolve(\"@babel/runtime/helpers/typeof\");",
        "void require.resolve(\"dayjs\");",
        "void require.resolve(\"i18next\");",
        "void require.resolve(\"lunar-lite\");",
        "void require.resolve(\"lunar-typescript\");",
        "void setLanguage; void zhCnStars;",
        "parentPort?.postMessage(Boolean(astro));"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/src/iztro-2.5.8-lock-closure.json`, json(frozenIztroClosure));
      write(root, `packages/${draft.directoryName}/src/official-calendar-evidence.ts`, "export const officialCalendarEvidence = true;\n");
      write(root, `packages/${draft.directoryName}/scripts/audit-calendar.ts`, "import { readFile } from \"node:fs/promises\";\nimport { officialCalendarEvidence } from \"../src/official-calendar-evidence.ts\";\nvoid readFile; void officialCalendarEvidence;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/main.ts`, [
        "import { browserClient } from \"./browser-client.ts\";",
        "export const browserPreview = browserClient;"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/src/browser-preview/browser-client.ts`, [
        "import sourceIdentity from \"./generated-browser-source-identity.ts\";",
        "import { requireVerifiedBrowserProbeResponse } from \"./main-response-gate.ts\";",
        "export function browserClient() {",
        "  const worker = new Worker(new URL(\"./browser-worker.ts\", import.meta.url));",
        "  let messageCount = 0;",
        "  const timeoutMs = 15_000;",
        "  void sourceIdentity; void requireVerifiedBrowserProbeResponse; void messageCount; void timeoutMs;",
        "  worker.terminate();",
        "}"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/src/browser-preview/browser-worker.ts`, [
        "import { astro } from \"iztro\";",
        "import { setLanguage } from \"iztro/lib/i18n\";",
        "import zhCnStars from \"iztro/lib/i18n/locales/zh-CN/star\";",
        "import snapshot from \"./generated-rule-snapshot.ts\";",
        "import sourceIdentity from \"./generated-browser-source-identity.ts\";",
        "void astro; void setLanguage; void zhCnStars; void sourceIdentity;",
        "self.postMessage(snapshot);"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/src/browser-preview/browser-artifact.ts`, "export type SourceIdentity = Readonly<Record<string, unknown>>;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/browser-protocol.ts`, "export const protocol = true;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/display-projection.ts`, "export const projection = true;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/main-response-gate.ts`, "export const gate = true;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/generated-rule-snapshot.ts`, "import type { Snapshot } from \"../contract-bridge.ts\";\nconst snapshot: Snapshot = null as never;\nexport default snapshot;\n");
      write(root, `packages/${draft.directoryName}/src/browser-preview/generated-browser-source-identity.ts`, [
        "import type { SourceIdentity } from \"./browser-artifact.ts\";",
        "throw new Error(\"dedicated Vite injection required\");",
        "const identity: SourceIdentity = null as never;",
        "export default identity;"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/browser-preview/emit-rule-snapshot.mjs`, "import snapshot from \"../src/index.ts\";\nprocess.stdout.write(JSON.stringify(snapshot));\n");
      write(root, `packages/${draft.directoryName}/browser-preview/index.html`, "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'self'\"><script type=\"module\" src=\"../src/browser-preview/main.ts\"></script>\n");
      write(root, `packages/${draft.directoryName}/vite.browser-preview.config.mjs`, [
        "import path from \"node:path\";",
        "import { createHash } from \"node:crypto\";",
        "import { readFileSync } from \"node:fs\";",
        "const browserWorkerModule = \"browser-worker.ts\";",
        "const browserClientModule = \"browser-client.ts\";",
        "const ruleSentinel = \"generated-rule-snapshot.ts\";",
        "const sourceSentinel = \"generated-browser-source-identity.ts\";",
        "const generatedSourceIdentityModule = \"\\0hakimi:ziwei-browser-preview-source-identity\";",
        "const browserSourcePaths = [",
        "  \"src/browser-preview/browser-artifact.ts\",",
        "  \"src/browser-preview/browser-client.ts\",",
        "  \"src/browser-preview/browser-protocol.ts\",",
        "  \"src/browser-preview/browser-worker.ts\",",
        "  \"src/browser-preview/display-projection.ts\",",
        "  \"src/browser-preview/main-response-gate.ts\",",
        "  \"src/browser-preview/main.ts\",",
        "  \"src/contract-bridge.ts\",",
        "  \"src/iztro-2.5.8-lock-closure.json\"",
        "];",
        "void path; void browserWorkerModule; void browserClientModule; void ruleSentinel; void sourceSentinel;",
        "void generatedSourceIdentityModule; void browserSourcePaths; void readFileSync;",
        "createHash(\"sha256\");",
        "export default { plugins: [], worker: { plugins: () => [] } };"
      ].join("\n"));
      write(root, `packages/${draft.directoryName}/tsconfig.browser-preview.json`, json({
        compilerOptions: { paths: {} },
        include: ["src/browser-preview/**/*.ts"]
      }));
    } else {
      write(root, `packages/${draft.directoryName}/src/index.ts`, "import { z } from \"zod\";\nexport const value = z.string();\n");
    }
    lockPackages[`packages/${draft.directoryName}`] = {
      name: draft.packageName,
      version: manifest.version,
      dependencies: draft.dependencies
    };
    lockPackages[`node_modules/${draft.packageName}`] = {
      resolved: `packages/${draft.directoryName}`,
      link: true
    };
  }
  for (const node of frozenIztroClosure.nodes) {
    const dependencies = Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested]));
    lockPackages[node.packagePath] = {
      version: node.version,
      resolved: node.resolved,
      integrity: node.integrity,
      ...(Object.keys(dependencies).length > 0 ? { dependencies } : {})
    };
  }
  write(root, "package-lock.json", json({
    name: "boundary-fixture",
    version: "1.0.0",
    lockfileVersion: 3,
    packages: lockPackages
  }));
  write(root, "apps/web/package.json", json({ name: "@fixture/web", version: "1.0.0", private: true }));
  write(root, "apps/web/src/main.ts", [
    "// import \"@hakimi/ziwei-doushu-contracts-draft\";",
    "export const ready = true;"
  ].join("\n"));
  write(root, "apps/web/index.html", [
    "<!-- import '@hakimi/western-astrology-contracts-draft' -->",
    "<script type=\"module\" src=\"/src/main.ts\"></script>"
  ].join("\n"));
  write(root, "tools/vite.config.ts", "// @hakimi/ziwei-doushu-contracts-draft and ziwei-doushu-contracts-draft\nexport default {};\n");
  write(root, "tsconfig.json", [
    "{",
    "  // @hakimi/western-astrology-contracts-draft and western-astrology-contracts-draft",
    "  \"compilerOptions\": { \"paths\": {} }",
    "}"
  ].join("\n"));
  write(root, "packages/storage/package.json", json({ name: "@fixture/storage", version: "1.0.0", private: true }));
  write(root, "packages/storage/src/index.ts", "export const stored = true;\n");
  return root;
}

function activatePlannedFortel(root, indexSource = [
  "import { Worker as NodeWorker } from \"node:worker_threads\";",
  "const WORKER_ENTRY_URL = new URL(\"./fortel-worker-entry.mjs\", import.meta.url);",
  "export const identity = { isolation: \"fresh_worker_per_calculation\" };",
  "export function run() { return new NodeWorker(WORKER_ENTRY_URL); }",
  "export * from \"./contract-bridge.ts\";"
].join("\n")) {
  assert.ok(plannedFortelDraft);
  const closurePolicy = plannedFortelDraft.lockClosures[0];
  const manifest = {
    name: plannedFortelDraft.packageName,
    version: "0.0.0-draft.0",
    private: true,
    type: "module",
    exports: {},
    "x-hakimi-isolated-draft": {
      schemaVersion: 1,
      kind: plannedFortelDraft.kind,
      systemId: plannedFortelDraft.systemId,
      productionImport: "forbidden",
      allowedDraftDependencies: allowedDraftDependencies(plannedFortelDraft)
    },
    dependencies: plannedFortelDraft.dependencies
  };
  const closure = {
    schemaVersion: 1,
    proofScope: "package_lock_closure_identity_not_installed_bytes",
    lockfileVersion: 3,
    entryPackage: {
      packagePath: `packages/${plannedFortelDraft.directoryName}`,
      name: plannedFortelDraft.packageName,
      version: manifest.version,
      dependencies: [{
        name: closurePolicy.dependency,
        requested: closurePolicy.version,
        resolvedPackagePath: `node_modules/${closurePolicy.dependency}`,
        resolvedVersion: closurePolicy.version
      }]
    },
    rootOverrides: { util: "0.12.5" },
    nodes: [
      {
        packagePath: `node_modules/${closurePolicy.dependency}`,
        name: closurePolicy.dependency,
        version: closurePolicy.version,
        resolved: closurePolicy.resolved,
        integrity: closurePolicy.integrity,
        dependencies: [{
          name: "util",
          requested: "0.12.5",
          resolvedPackagePath: "node_modules/util",
          resolvedVersion: "0.12.5"
        }]
      },
      {
        packagePath: "node_modules/util",
        name: "util",
        version: "0.12.5",
        resolved: "https://registry.npmjs.org/util/-/util-0.12.5.tgz",
        integrity: "sha512-boundary-fixture-util",
        dependencies: []
      }
    ]
  };

  write(root, `packages/${plannedFortelDraft.directoryName}/package.json`, json(manifest));
  write(root, `packages/${plannedFortelDraft.directoryName}/src/index.ts`, `${indexSource}\n`);
  write(root, `packages/${plannedFortelDraft.directoryName}/src/fortel-worker-entry.mjs`, [
    "import fortel from \"fortel-ziweidoushu\";",
    "import { parentPort, workerData } from \"node:worker_threads\";",
    "void fortel; void workerData;",
    "parentPort?.postMessage(true);",
    "parentPort?.close();"
  ].join("\n"));
  write(root, `packages/${plannedFortelDraft.directoryName}/src/contract-bridge.ts`,
    "export * from \"../../ziwei-doushu-contracts-draft/src/index.ts\";\n");
  write(root, `packages/${plannedFortelDraft.directoryName}/src/iztro-adapter-bridge.ts`,
    "export * from \"../../ziwei-iztro-adapter-draft/src/index.ts\";\n");
  write(root, `packages/${plannedFortelDraft.directoryName}/${closurePolicy.artifact}`, json(closure));

  const rootManifestPath = path.join(root, "package.json");
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
  rootManifest.overrides.util = "0.12.5";
  write(root, "package.json", json(rootManifest));

  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.packages[`packages/${plannedFortelDraft.directoryName}`] = {
    name: plannedFortelDraft.packageName,
    version: manifest.version,
    dependencies: plannedFortelDraft.dependencies
  };
  lock.packages[`node_modules/${plannedFortelDraft.packageName}`] = {
    resolved: `packages/${plannedFortelDraft.directoryName}`,
    link: true
  };
  for (const node of closure.nodes) {
    const dependencies = Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested]));
    lock.packages[node.packagePath] = {
      version: node.version,
      resolved: node.resolved,
      integrity: node.integrity,
      ...(Object.keys(dependencies).length > 0 ? { dependencies } : {})
    };
  }
  write(root, "package-lock.json", json(lock));
  return closure;
}

function activateWesternAstronomyParity(root) {
  assert.ok(plannedWesternAstronomyDraft);
  const sourceRoot = path.join(workspaceRoot, "packages", plannedWesternAstronomyDraft.directoryName);
  const targetRoot = path.join(root, "packages", plannedWesternAstronomyDraft.directoryName);
  fs.cpSync(sourceRoot, targetRoot, {
    recursive: true,
    filter(source) {
      return !["dist", "node_modules"].includes(path.basename(source));
    }
  });

  const rootManifestPath = path.join(root, "package.json");
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
  rootManifest.overrides = {
    ...(rootManifest.overrides ?? {}),
    ...frozenAstronomyEngineClosure.rootOverrides
  };
  write(root, "package.json", json(rootManifest));

  const packageManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, "package.json"), "utf8"));
  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.packages[`packages/${plannedWesternAstronomyDraft.directoryName}`] = {
    name: plannedWesternAstronomyDraft.packageName,
    version: packageManifest.version,
    dependencies: packageManifest.dependencies
  };
  lock.packages[`node_modules/${plannedWesternAstronomyDraft.packageName}`] = {
    resolved: `packages/${plannedWesternAstronomyDraft.directoryName}`,
    link: true
  };
  for (const node of frozenAstronomyEngineClosure.nodes) {
    const dependencies = Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested]));
    lock.packages[node.packagePath] = {
      version: node.version,
      resolved: node.resolved,
      integrity: node.integrity,
      ...(Object.keys(dependencies).length > 0 ? { dependencies } : {})
    };
  }
  write(root, "package-lock.json", json(lock));
  return targetRoot;
}

function activateZiweiWorkspaceBrowserApp(root) {
  assert.ok(plannedZiweiWorkspaceDraft);
  const sourceRoot = path.join(workspaceRoot, "packages", plannedZiweiWorkspaceDraft.directoryName);
  const targetRoot = path.join(root, "packages", plannedZiweiWorkspaceDraft.directoryName);
  fs.cpSync(sourceRoot, targetRoot, {
    recursive: true,
    filter(source) {
      return !["dist", "node_modules"].includes(path.basename(source));
    }
  });

  const rootManifestPath = path.join(root, "package.json");
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
  rootManifest.scripts = { ...(rootManifest.scripts ?? {}), build: "npm run build --workspace @hakimi/web" };
  write(root, "package.json", json(rootManifest));

  const packageManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, "package.json"), "utf8"));
  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.packages[`packages/${plannedZiweiWorkspaceDraft.directoryName}`] = {
    name: plannedZiweiWorkspaceDraft.packageName,
    version: packageManifest.version,
    dependencies: packageManifest.dependencies
  };
  lock.packages[`node_modules/${plannedZiweiWorkspaceDraft.packageName}`] = {
    resolved: `packages/${plannedZiweiWorkspaceDraft.directoryName}`,
    link: true
  };
  write(root, "package-lock.json", json(lock));
  return targetRoot;
}

function activateWesternRulesPreview(root) {
  assert.ok(plannedWesternRulesPreviewDraft);
  const directoryName = plannedWesternRulesPreviewDraft.directoryName;
  const packageDirectory = path.join(root, "packages", directoryName);
  fs.mkdirSync(path.join(packageDirectory, "src", "browser-app"), { recursive: true });
  fs.mkdirSync(path.join(packageDirectory, "browser-app"), { recursive: true });
  fs.copyFileSync(
    path.join(workspaceRoot, "packages", directoryName, "package.json"),
    path.join(packageDirectory, "package.json")
  );
  write(root, `packages/${directoryName}/src/rule-layer-bridge.ts`,
    "export const runWesternRuleLayer = () => ({ outcome: \"computed\" });\n");
  write(root, `packages/${directoryName}/src/browser-client.ts`, [
    "export function runWesternRulesPreviewWorker() {",
    "  const worker = new Worker(new URL(\"../../western-astronomy-engine-adapter-draft/src/browser-parity/browser-worker.ts\", import.meta.url));",
    "  let messageCount = 0;",
    "  const audit = { isolation: \"fresh_browser_worker_per_seed\" };",
    "  void messageCount; void audit;",
    "  worker.terminate();",
    "}"
  ].join("\n"));
  write(root, `packages/${directoryName}/src/browser-app/main.ts`, [
    "import { runWesternRulesPreviewWorker } from \"../browser-client.ts\";",
    "import { runWesternRuleLayer } from \"../rule-layer-bridge.ts\";",
    "const invokeWorker = () => runWesternRulesPreviewWorker(\"2025-03-20T09:01:00.000Z\", [\"sun\"]);",
    "const invokeRules = () => runWesternRuleLayer({});",
    "void invokeWorker; void invokeRules;"
  ].join("\n"));
  write(root, `packages/${directoryName}/browser-app/index.html`, [
    "<!doctype html>",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'\">",
    "<script type=\"module\" src=\"../src/browser-app/main.ts\"></script>"
  ].join("\n"));
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"));
  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.packages[`packages/${directoryName}`] = {
    name: manifest.name,
    version: manifest.version,
    dependencies: manifest.dependencies
  };
  lock.packages[`node_modules/${manifest.name}`] = {
    resolved: `packages/${directoryName}`,
    link: true
  };
  write(root, "package-lock.json", json(lock));
}

function expectFailure(root, pattern) {
  const failures = verifySystemContractDraftBoundaries(root);
  assert.match(failures.join("\n"), pattern);
}

test("accepts isolated drafts and ignores code, HTML, Vite, and tsconfig comments", () => {
  const root = createFixture();
  write(root, "apps/web/src/static-module-loads.ts", [
    "import '@fixture/storage';",
    "export const moduleUrl = import.meta.url;",
    "export const inertText = 'require(variableName)';",
    "export const inertPattern = /import(variableName)/u;",
    "void import('./main');"
  ].join("\n"));
  assert.deepEqual(verifySystemContractDraftBoundaries(root), []);
});

test("activates the pre-registered Fortel draft only when its exact graph and closure are present", () => {
  const root = createFixture();
  activatePlannedFortel(root);
  assert.deepEqual(verifySystemContractDraftBoundaries(root), []);
});

test("requires the fixed Fortel Worker entry and rejects a missing Worker", () => {
  const root = createFixture();
  activatePlannedFortel(root);
  fs.rmSync(path.join(root, "packages/ziwei-fortel-differential-draft/src/fortel-worker-entry.mjs"));
  expectFailure(root, /fortel-worker-entry\.mjs is required by the fresh Fortel Worker boundary/u);
});

test("rejects a direct Fortel import from the differential host", () => {
  const root = createFixture();
  activatePlannedFortel(root);
  write(root, "packages/ziwei-fortel-differential-draft/src/index.ts", [
    "import fortel from \"fortel-ziweidoushu\";",
    "import { Worker as NodeWorker } from \"node:worker_threads\";",
    "const WORKER_ENTRY_URL = new URL(\"./fortel-worker-entry.mjs\", import.meta.url);",
    "export const identity = { isolation: \"fresh_worker_per_calculation\" };",
    "export function run() { void fortel; return new NodeWorker(WORKER_ENTRY_URL); }",
    "export * from \"./contract-bridge.ts\";"
  ].join("\n"));
  expectFailure(root, /may import fortel-ziweidoushu only from src\/fortel-worker-entry\.mjs/u);
});

test("rejects a direct Fortel import from the differential demo", () => {
  const root = createFixture();
  activatePlannedFortel(root);
  write(root, "packages/ziwei-fortel-differential-draft/src/demo.ts", [
    "import fortel from \"fortel-ziweidoushu\";",
    "void fortel;"
  ].join("\n"));
  expectFailure(root, /may import fortel-ziweidoushu only from src\/fortel-worker-entry\.mjs/u);
});

test("reserves the planned Fortel identity from app, schema, and backup code before the package exists", () => {
  const root = createFixture();
  write(root, "apps/web/src/fortel.ts", "import \"@hakimi/ziwei-fortel-differential-draft\";\n");
  write(root, "packages/contracts/src/fortel.ts", "import \"@hakimi/ziwei-fortel-differential-draft\";\n");
  write(root, "packages/backup/src/fortel.ts", "import \"@hakimi/ziwei-fortel-differential-draft\";\n");
  const failures = verifySystemContractDraftBoundaries(root);
  assert.equal(failures.filter((failure) =>
    failure.includes("imports isolated draft @hakimi/ziwei-fortel-differential-draft")
  ).length, 3);
});

test("rejects an unregistered draft directory and forbidden adapter or differential graph edges", () => {
  const root = createFixture();
  write(root, "packages/unregistered-engine-draft/package.json", json({
    name: "@hakimi/unregistered-engine-draft",
    version: "0.0.0-draft.0",
    private: true
  }));
  write(root, "packages/unregistered-engine-draft/src/index.ts", "export const unregistered = true;\n");
  expectFailure(root, /packages\/unregistered-engine-draft is an unregistered isolated draft directory/u);

  const differentialChainRegistry = structuredClone(draftRegistry);
  const fortel = differentialChainRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/ziwei-fortel-differential-draft"
  );
  fortel.dependencies = {
    "@hakimi/ziwei-fortel-differential-draft": "0.0.0-draft.0",
    "fortel-ziweidoushu": "1.3.4"
  };
  fortel.crossDraftEdges = [{
    from: "src/contract-bridge.ts",
    toPackage: "@hakimi/ziwei-fortel-differential-draft",
    to: "src/index.ts"
  }];
  const differentialFailures = verifySystemContractDraftBoundaries(createFixture(), differentialChainRegistry);
  assert.match(differentialFailures.join("\n"), /violates the same-system draft graph/u);

  const adapterChainRegistry = structuredClone(draftRegistry);
  const iztro = adapterChainRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/ziwei-iztro-adapter-draft"
  );
  iztro.dependencies = {
    "@hakimi/ziwei-fortel-differential-draft": "0.0.0-draft.0",
    iztro: "2.5.8",
    zod: "4.4.3"
  };
  iztro.crossDraftEdges = [{
    from: "src/contract-bridge.ts",
    toPackage: "@hakimi/ziwei-fortel-differential-draft",
    to: "src/index.ts"
  }];
  const adapterFailures = verifySystemContractDraftBoundaries(createFixture(), adapterChainRegistry);
  assert.match(adapterFailures.join("\n"), /violates the same-system draft graph/u);
});

test("allows a workspace leaf to depend only on same-system contracts and adapters", () => {
  const workspacePackage = "@hakimi/ziwei-workspace-artifact-draft";

  const crossSystemRegistry = structuredClone(draftRegistry);
  const crossSystemWorkspace = crossSystemRegistry.drafts.find((draft) =>
    draft.packageName === workspacePackage
  );
  assert.ok(crossSystemWorkspace);
  crossSystemWorkspace.dependencies = {
    "@hakimi/western-astrology-contracts-draft": "0.0.0-draft.0",
    zod: "4.4.3"
  };
  crossSystemWorkspace.crossDraftEdges = [{
    from: "src/contract-bridge.ts",
    toPackage: "@hakimi/western-astrology-contracts-draft",
    to: "src/index.ts"
  }];
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), crossSystemRegistry).join("\n"),
    /violates the same-system draft graph/u
  );

  const chainedRegistry = structuredClone(draftRegistry);
  const chainedWorkspace = chainedRegistry.drafts.find((draft) =>
    draft.packageName === workspacePackage
  );
  assert.ok(chainedWorkspace);
  chainedWorkspace.dependencies = {
    "@hakimi/ziwei-fortel-differential-draft": "0.0.0-draft.0",
    zod: "4.4.3"
  };
  chainedWorkspace.crossDraftEdges = [{
    from: "src/contract-bridge.ts",
    toPackage: "@hakimi/ziwei-fortel-differential-draft",
    to: "src/index.ts"
  }];
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), chainedRegistry).join("\n"),
    /violates the same-system draft graph/u
  );

  const unknownRegistry = structuredClone(draftRegistry);
  const unknownWorkspace = unknownRegistry.drafts.find((draft) =>
    draft.packageName === workspacePackage
  );
  assert.ok(unknownWorkspace);
  unknownWorkspace.dependencies = { zod: "4.4.3" };
  unknownWorkspace.crossDraftEdges = [{
    from: "src/contract-bridge.ts",
    toPackage: "@hakimi/unknown-adapter-draft",
    to: "src/index.ts"
  }];
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), unknownRegistry).join("\n"),
    /targets unknown draft/u
  );
});

test("reserves the workspace draft from production imports before or after activation", () => {
  const root = createFixture();
  write(root, "apps/web/src/ziwei-workspace.ts", "import \"@hakimi/ziwei-workspace-artifact-draft\";\n");
  expectFailure(
    root,
    /imports isolated draft @hakimi\/ziwei-workspace-artifact-draft/u
  );
});

test("accepts the exact isolated Ziwei workspace Browser app", () => {
  const root = createFixture();
  activateZiweiWorkspaceBrowserApp(root);
  assert.deepEqual(verifySystemContractDraftBoundaries(root), []);
});

test("rejects a copied workspace Worker or a detached Browser injection chain", () => {
  const workerRoot = createFixture();
  activateZiweiWorkspaceBrowserApp(workerRoot);
  write(workerRoot, "packages/ziwei-workspace-artifact-draft/src/browser-app/main.ts", [
    "const worker = new Worker(new URL(\"./worker.ts\", import.meta.url));",
    "void worker;"
  ].join("\n"));
  expectFailure(workerRoot, /must use the audited calculation bridge and Repository/u);

  const viteRoot = createFixture();
  activateZiweiWorkspaceBrowserApp(viteRoot);
  write(viteRoot, "packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs", [
    "import path from \"node:path\";",
    "import { fileURLToPath } from \"node:url\";",
    "import adapterBrowserPreviewConfig from \"../ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs\";",
    "const packageRoot = path.dirname(fileURLToPath(import.meta.url));",
    "const appRoot = path.join(packageRoot, \"browser-app\");",
    "void adapterBrowserPreviewConfig;",
    "export default { root: appRoot, plugins: [], worker: {}, build: { outDir: path.join(packageRoot, \"dist\", \"browser-app\") } };"
  ].join("\n"));
  expectFailure(viteRoot, /must reuse the audited adapter main\/Worker injection chain with no aliases/u);
});

test("rejects widening the Ziwei workspace Browser-safe registry policy", () => {
  const widenedRegistry = structuredClone(draftRegistry);
  const workspace = widenedRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/ziwei-workspace-artifact-draft"
  );
  assert.ok(workspace);
  workspace.browserPreview.allowedBareImports.push("node:fs");
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), widenedRegistry).join("\n"),
    /must keep the exact isolated Ziwei workspace Browser graph/u
  );
});

test("accepts the exact isolated Western rules preview graph", () => {
  const root = createFixture();
  activateWesternRulesPreview(root);
  assert.deepEqual(verifySystemContractDraftBoundaries(root), []);
});

test("rejects a detached Worker or persistence in the Western rules preview", () => {
  const workerRoot = createFixture();
  activateWesternRulesPreview(workerRoot);
  write(
    workerRoot,
    "packages/western-astrology-rules-preview-draft/src/browser-client.ts",
    "export function runWesternRulesPreviewWorker() { const w = new Worker(new URL(\"./worker.ts\", import.meta.url)); void w; }\n"
  );
  expectFailure(workerRoot, /must create one fresh audited Browser Worker per request and reject reuse/u);

  const persistenceRoot = createFixture();
  activateWesternRulesPreview(persistenceRoot);
  write(persistenceRoot, "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts", [
    "import { runWesternRulesPreviewWorker } from \"../browser-client.ts\";",
    "import { runWesternRuleLayer } from \"../rule-layer-bridge.ts\";",
    "const database = indexedDB.open(\"chart-data\");",
    "void database; void runWesternRulesPreviewWorker; void runWesternRuleLayer;"
  ].join("\n"));
  expectFailure(persistenceRoot, /must not persist or cache any chart data/u);
});

test("rejects widening the Western rules preview Browser-safe registry policy", () => {
  const widenedRegistry = structuredClone(draftRegistry);
  const preview = widenedRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/western-astrology-rules-preview-draft"
  );
  assert.ok(preview);
  preview.browserPreview.allowedBareImports.push("node:fs");
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), widenedRegistry).join("\n"),
    /must keep the exact Western rules preview Browser graph/u
  );
});

test("rejects Fortel imports outside its exact bare and cross-draft allowlists", () => {
  const root = createFixture();
  activatePlannedFortel(root, [
    "import \"iztro\";",
    "export * from \"../../ziwei-iztro-adapter-draft/src/index.ts\";"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root).join("\n");
  assert.match(failures, /ziwei-fortel-differential-draft\/src\/index\.ts imports forbidden module iztro/u);
  assert.match(failures, /ziwei-fortel-differential-draft\/src\/index\.ts escapes its isolated src directory/u);
});

test("rejects unreachable nodes added to a registered lock closure", () => {
  const root = createFixture();
  const closure = activatePlannedFortel(root);
  closure.nodes.push({
    packagePath: "node_modules/unreachable-probe",
    name: "unreachable-probe",
    version: "1.0.0",
    resolved: "https://registry.npmjs.org/unreachable-probe/-/unreachable-probe-1.0.0.tgz",
    integrity: "sha512-unreachable-boundary-probe",
    dependencies: []
  });
  closure.nodes.sort((left, right) => left.packagePath.localeCompare(right.packagePath));
  const closurePolicy = plannedFortelDraft.lockClosures[0];
  write(root, `packages/${plannedFortelDraft.directoryName}/${closurePolicy.artifact}`, json(closure));
  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const unreachable = closure.nodes.find((node) => node.name === "unreachable-probe");
  lock.packages[unreachable.packagePath] = {
    version: unreachable.version,
    resolved: unreachable.resolved,
    integrity: unreachable.integrity
  };
  write(root, "package-lock.json", json(lock));
  expectFailure(root, /nodes must exactly equal the dependency closure reachable from its registered entry edge/u);
});

test("rejects relative escape and cross-draft imports from draft source", () => {
  const root = createFixture();
  write(root, "packages/ziwei-doushu-contracts-draft/src/escape.ts", [
    "import \"../../storage/src/index.ts\";",
    "import \"../../western-astrology-contracts-draft/src/index.ts\";"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root);
  assert.equal(failures.filter((failure) => failure.includes("escapes its isolated src directory")).length, 2);
});

test("permits only the declared adapter bridge and rejects reverse or alternate cross-draft edges", () => {
  const root = createFixture();
  write(root, "packages/ziwei-iztro-adapter-draft/src/alternate.ts", "export * from \"../../ziwei-doushu-contracts-draft/src/index.ts\";\n");
  write(root, "packages/ziwei-doushu-contracts-draft/src/reverse.ts", "export * from \"../../ziwei-iztro-adapter-draft/src/index.ts\";\n");
  const failures = verifySystemContractDraftBoundaries(root);
  assert.equal(failures.filter((failure) => failure.includes("escapes its isolated src directory")).length, 2);
});

test("rejects browser-preview Node imports, adapter-graph escapes, and alternate cross-draft edges", () => {
  const root = createFixture();
  write(root, "packages/ziwei-iztro-adapter-draft/src/browser-preview/escape.ts", [
    "import \"../../../storage/src/index.ts\";",
    "import \"../../../western-astrology-contracts-draft/src/index.ts\";",
    "import \"../index.ts\";",
    "import \"node:fs\";"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root);
  assert.equal(failures.filter((failure) => failure.includes("src/browser-preview/escape.ts escapes its browser-safe preview graph")).length, 3);
  assert.equal(failures.filter((failure) => failure.includes("src/browser-preview/escape.ts imports browser-unsafe module node:fs")).length, 1);
});

test("rejects a production bridge into the isolated browser-preview entry", () => {
  const root = createFixture();
  write(root, "content/browser-preview-bridge.ts", "export * from \"../packages/ziwei-iztro-adapter-draft/src/browser-preview/main.ts\";\n");
  expectFailure(root, /content\/browser-preview-bridge\.ts resolves into isolated draft/u);
});

test("rejects Vite config and snapshot emitter imports outside the isolated adapter", () => {
  const configRoot = createFixture();
  write(configRoot, "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs", [
    "import path from \"node:path\";",
    "import \"../../apps/web/src/main.ts\";",
    "import \"../western-astrology-contracts-draft/src/index.ts\";",
    "export default { root: path.resolve(\"browser-preview\") };"
  ].join("\n"));
  const configFailures = verifySystemContractDraftBoundaries(configRoot).join("\n");
  assert.match(configFailures, /vite\.browser-preview\.config\.mjs escapes its isolated adapter directory/u);

  const emitterRoot = createFixture();
  write(emitterRoot, "packages/ziwei-iztro-adapter-draft/browser-preview/emit-rule-snapshot.mjs", [
    "import snapshot from \"../src/index.ts\";",
    "import \"../../../apps/web/src/main.ts\";",
    "process.stdout.write(JSON.stringify(snapshot));"
  ].join("\n"));
  const emitterFailures = verifySystemContractDraftBoundaries(emitterRoot).join("\n");
  assert.match(emitterFailures, /emit-rule-snapshot\.mjs must import only the fixed adapter snapshot entry/u);
  assert.match(emitterFailures, /emit-rule-snapshot\.mjs may import only packages\/ziwei-iztro-adapter-draft\/src\/index\.ts/u);
});

test("rejects a widened or aliased browser-preview typecheck surface", () => {
  const root = createFixture();
  write(root, "packages/ziwei-iztro-adapter-draft/tsconfig.browser-preview.json", json({
    compilerOptions: { paths: { "#production/*": ["../../apps/web/src/*"] } },
    include: ["src/**/*.ts", "../../apps/web/src/**/*.ts"]
  }));
  expectFailure(root, /tsconfig\.browser-preview\.json must typecheck only the audited browser-preview source with no aliases/u);
});

test("rejects a detached browser Worker snapshot sentinel or Vite injection chain", () => {
  const workerRoot = createFixture();
  write(workerRoot, "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-worker.ts", "self.postMessage({ ok: true });\n");
  expectFailure(workerRoot, /browser-worker\.ts must import the fixed generated snapshot sentinel/u);

  const viteRoot = createFixture();
  write(viteRoot, "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs", "import path from \"node:path\";\nexport default { root: path.resolve(\"browser-preview\") };\n");
  expectFailure(viteRoot, /vite\.browser-preview\.config\.mjs must inject the fixed rule snapshot and Browser source identity/u);

  const sourceSentinelRoot = createFixture();
  write(sourceSentinelRoot,
    "packages/ziwei-iztro-adapter-draft/src/browser-preview/generated-browser-source-identity.ts",
    "export default {};\n");
  expectFailure(sourceSentinelRoot, /must remain a typed fail-closed Browser source-identity sentinel/u);

  const detachedSourceRoot = createFixture();
  write(detachedSourceRoot, "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts", "export const client = true;\n");
  expectFailure(detachedSourceRoot, /must bind the injected Browser source identity in both reusable client and fresh Worker graphs/u);
});

test("rejects adapter tool scripts that import a wider Node, workspace, draft, or package graph", () => {
  const root = createFixture();
  write(root, "packages/ziwei-iztro-adapter-draft/scripts/escape.ts", [
    "import \"node:fs\";",
    "import \"../../../apps/web/src/main.ts\";",
    "import \"../../western-astrology-contracts-draft/src/index.ts\";",
    "import \"iztro\";"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root).join("\n");
  assert.match(failures, /scripts\/escape\.ts imports forbidden isolated-tool module node:fs/u);
  assert.match(failures, /scripts\/escape\.ts may import only packages\/ziwei-iztro-adapter-draft\/src\/official-calendar-evidence\.ts/u);
  assert.match(failures, /scripts\/escape\.ts imports forbidden isolated-tool module iztro/u);
});

test("keeps fixed iztro lock-identity imports inside the Node Worker entry", () => {
  const root = createFixture();
  const workerOnlySpecifiers = [
    "@babel/runtime/helpers/typeof",
    "dayjs",
    "i18next",
    "lunar-lite",
    "lunar-typescript"
  ];
  write(root, "packages/ziwei-iztro-adapter-draft/src/demo.ts",
    `${workerOnlySpecifiers.map((specifier) => `import \"${specifier}\";`).join("\n")}\n`);
  const failures = verifySystemContractDraftBoundaries(root);
  for (const specifier of workerOnlySpecifiers) {
    assert.equal(failures.filter((failure) =>
      failure.includes(`may import ${specifier} only from src/node-worker-entry.mjs`)
    ).length, 1);
  }
});

test("rejects an iztro upstream import from the adapter host", () => {
  const root = createFixture();
  write(root, "packages/ziwei-iztro-adapter-draft/src/index.ts", [
    "import { astro } from \"iztro\";",
    "import { Worker } from \"node:worker_threads\";",
    "void astro;",
    "export { Worker };",
    "export * from \"./contract-bridge.ts\";"
  ].join("\n"));
  expectFailure(root, /may import iztro only from src\/node-worker-entry\.mjs and src\/browser-preview\/browser-worker\.ts/u);
});

test("accepts the exact isolated Western Astronomy Browser parity graph", () => {
  const root = createFixture();
  activateWesternAstronomyParity(root);
  assert.deepEqual(verifySystemContractDraftBoundaries(root), []);
});

test("rejects widening or detaching the Western Browser-safe registry policy", () => {
  const widenedRegistry = structuredClone(draftRegistry);
  const widenedWestern = widenedRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/western-astronomy-engine-adapter-draft"
  );
  assert.ok(widenedWestern);
  widenedWestern.browserPreview.allowedBareImports.push("node:fs");
  assert.match(
    verifySystemContractDraftBoundaries(createFixture(), widenedRegistry).join("\n"),
    /must keep the exact Western Browser-safe graph/u
  );

  const detachedRegistry = structuredClone(draftRegistry);
  const detachedWestern = detachedRegistry.drafts.find((draft) =>
    draft.packageName === "@hakimi/western-astronomy-engine-adapter-draft"
  );
  assert.ok(detachedWestern);
  detachedWestern.specialChecks = [];
  const detachedFailures = verifySystemContractDraftBoundaries(createFixture(), detachedRegistry).join("\n");
  assert.match(detachedFailures, /must keep astronomy-engine-browser-parity-v1/u);
  assert.match(detachedFailures, /must keep astronomy-engine-fresh-worker-v1/u);
});

test("rejects a missing Western Browser Worker and engine imports outside the exact two Workers", () => {
  const missingWorkerRoot = createFixture();
  const missingWorkerPackage = activateWesternAstronomyParity(missingWorkerRoot);
  fs.rmSync(path.join(missingWorkerPackage, "src/browser-parity/browser-worker.ts"));
  expectFailure(missingWorkerRoot, /browser-worker\.ts is required by the isolated Astronomy Engine Browser parity boundary/u);

  const hostRoot = createFixture();
  const hostPackage = activateWesternAstronomyParity(hostRoot);
  fs.appendFileSync(path.join(hostPackage, "src/index.ts"), "\nimport * as ForbiddenHostAstronomy from \"astronomy-engine\";\nvoid ForbiddenHostAstronomy;\n", "utf8");
  expectFailure(hostRoot, /may import astronomy-engine only from src\/astronomy-worker-entry\.mjs and src\/browser-parity\/browser-worker\.ts/u);

  const mainRoot = createFixture();
  const mainPackage = activateWesternAstronomyParity(mainRoot);
  fs.appendFileSync(path.join(mainPackage, "src/browser-parity/main.ts"), "\nimport * as ForbiddenMainAstronomy from \"astronomy-engine\";\nvoid ForbiddenMainAstronomy;\n", "utf8");
  expectFailure(mainRoot, /may import astronomy-engine only from src\/astronomy-worker-entry\.mjs and src\/browser-parity\/browser-worker\.ts/u);
});

test("rejects a disconnected Western Vite reference plugin and a forged generated reference", () => {
  const viteRoot = createFixture();
  const vitePackage = activateWesternAstronomyParity(viteRoot);
  const vitePath = path.join(vitePackage, "vite.browser-parity.config.mjs");
  const viteSource = fs.readFileSync(vitePath, "utf8");
  assert.ok(viteSource.includes("plugins: [isolatedNodeReferencePlugin()]"));
  fs.writeFileSync(vitePath, viteSource.replace(
    "plugins: [isolatedNodeReferencePlugin()]",
    "plugins: []"
  ), "utf8");
  expectFailure(viteRoot, /must replace the fail-closed generated reference only for the fixed main module/u);

  const sentinelRoot = createFixture();
  const sentinelPackage = activateWesternAstronomyParity(sentinelRoot);
  write(sentinelRoot, path.relative(sentinelRoot, path.join(
    sentinelPackage,
    "src/browser-parity/generated-node-reference.ts"
  )), [
    "import type { WesternBrowserNodeReference } from \"./protocol.ts\";",
    "const forged = { generatedAtBuild: true, seeds: [] } as unknown as WesternBrowserNodeReference;",
    "export default forged;"
  ].join("\n"));
  expectFailure(sentinelRoot, /must remain a typed fail-closed null sentinel with no embedded reference data/u);
});

test("rejects Western emitter, HTML, tsconfig, and browser-safe graph escapes", () => {
  const emitterRoot = createFixture();
  const emitterPackage = activateWesternAstronomyParity(emitterRoot);
  fs.appendFileSync(path.join(emitterPackage, "browser-parity/emit-node-reference.mjs"), "\nimport { readFile } from \"node:fs\";\nvoid readFile;\n", "utf8");
  expectFailure(emitterRoot, /may import only the fixed Node host, seed lock, stable projection, and node:crypto digest utility/u);

  const surfaceRoot = createFixture();
  const surfacePackage = activateWesternAstronomyParity(surfaceRoot);
  const htmlPath = path.join(surfacePackage, "browser-parity/index.html");
  const htmlSource = fs.readFileSync(htmlPath, "utf8");
  assert.ok(htmlSource.includes("connect-src 'none'"));
  fs.writeFileSync(htmlPath, htmlSource.replace("connect-src 'none'", "connect-src 'self'"), "utf8");
  write(surfaceRoot, path.relative(surfaceRoot, path.join(surfacePackage, "tsconfig.browser-parity.json")), json({
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      lib: ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
      types: ["vite/client", "node"],
      paths: { "#production/*": ["../../apps/web/src/*"] }
    },
    include: ["src/browser-parity/**/*.ts", "../../apps/web/src/**/*.ts"]
  }));
  const surfaceFailures = verifySystemContractDraftBoundaries(surfaceRoot).join("\n");
  assert.match(surfaceFailures, /must keep the exact same-origin, no-connect Browser parity Content-Security-Policy/u);
  assert.match(surfaceFailures, /must typecheck only the exact isolated Browser parity source/u);

  const graphRoot = createFixture();
  const graphPackage = activateWesternAstronomyParity(graphRoot);
  write(graphRoot, path.relative(graphRoot, path.join(graphPackage, "src/browser-parity/escape.ts")), [
    "import \"node:fs\";",
    "import \"../../../storage/src/index.ts\";"
  ].join("\n"));
  const graphFailures = verifySystemContractDraftBoundaries(graphRoot).join("\n");
  assert.match(graphFailures, /src\/browser-parity\/escape\.ts imports browser-unsafe module node:fs/u);
  assert.match(graphFailures, /src\/browser-parity\/escape\.ts escapes its browser-safe preview graph/u);
});

test("rejects a reusable or unlocked Western Browser Worker", () => {
  const root = createFixture();
  const packageRoot = activateWesternAstronomyParity(root);
  const workerPath = path.join(packageRoot, "src/browser-parity/browser-worker.ts");
  const workerSource = fs.readFileSync(workerPath, "utf8");
  assert.ok(workerSource.includes("{ once: true }"));
  assert.ok(workerSource.includes("Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus)"));
  fs.writeFileSync(workerPath, workerSource
    .replace("{ once: true }", "{ once: false }")
    .replace(
      "Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus)",
      "Astronomy.SetDeltaTFunction(() => 0)"
    ), "utf8");
  expectFailure(root, /must remain a fixed single-shot Browser Worker with locked DeltaT sentinels and the shared stable projection/u);
});

test("rejects side-effect imports and a transitive bridge anywhere in the workspace", () => {
  const root = createFixture();
  write(root, "apps/web/src/direct.ts", "import \"@hakimi/ziwei-doushu-contracts-draft\";\n");
  write(root, "apps/web/src/direct-adapter.ts", "import \"@hakimi/ziwei-iztro-adapter-draft\";\n");
  write(root, "content/bridge.ts", "export * from \"../packages/western-astrology-contracts-draft/src/index.ts\";\n");
  write(root, "apps/web/src/consumer.ts", "import \"../../../content/bridge.ts\";\n");
  const failures = verifySystemContractDraftBoundaries(root).join("\n");
  assert.match(failures, /apps\/web\/src\/direct\.ts imports isolated draft/u);
  assert.match(failures, /apps\/web\/src\/direct-adapter\.ts imports isolated draft/u);
  assert.match(failures, /content\/bridge\.ts resolves into isolated draft/u);
});

test("rejects a concatenated isolated-draft import from production code", () => {
  const root = createFixture();
  write(root, "apps/web/src/computed-draft.ts", [
    "const packageSuffix = 'ziwei-doushu-contracts-draft';",
    "void import(\"@hakimi/\" + packageSuffix);"
  ].join("\n"));
  expectFailure(root, /apps\/web\/src\/computed-draft\.ts uses non-literal dynamic import module loading/u);
});

test("rejects a concatenated Fortel upstream import from its fixed Worker", () => {
  const root = createFixture();
  activatePlannedFortel(root);
  write(root, "packages/ziwei-fortel-differential-draft/src/fortel-worker-entry.mjs", [
    "import { parentPort, workerData } from 'node:worker_threads';",
    "const packageSuffix = 'ziweidoushu';",
    "const fortel = await import('fortel-' + packageSuffix);",
    "void workerData;",
    "parentPort?.postMessage(Boolean(fortel));",
    "parentPort?.close();"
  ].join("\n"));
  expectFailure(root, /ziwei-fortel-differential-draft\/src\/fortel-worker-entry\.mjs uses non-literal dynamic import module loading/u);
});

test("rejects variable require, require.resolve, and importScripts module loads", () => {
  const root = createFixture();
  write(root, "apps/web/src/computed-loads.ts", [
    "const moduleName = './runtime-module.js';",
    "void require(moduleName);",
    "void require.resolve(moduleName);",
    "importScripts('./fixed-worker-module.js', moduleName);"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root);
  for (const kind of ["require", "require.resolve", "importScripts"]) {
    assert.equal(failures.filter((failure) =>
      failure.includes(`apps/web/src/computed-loads.ts uses non-literal ${kind} module loading`)
    ).length, 1);
  }
});

test("rejects wildcard tsconfig targets and Vite aliases outside apps/web", () => {
  const root = createFixture();
  write(root, "tsconfig.json", json({
    compilerOptions: {
      baseUrl: ".",
      paths: { "#draft/*": ["packages/*/src/*"] }
    }
  }));
  write(root, "tools/vite.config.ts", [
    "export default { resolve: { alias: {",
    "  '#planned': '../../packages/ziwei-doushu-contracts-draft/src/index.ts'",
    "} } };"
  ].join("\n"));
  const failures = verifySystemContractDraftBoundaries(root).join("\n");
  assert.match(failures, /tsconfig\.json aliases isolated draft/u);
  assert.match(failures, /tools\/vite\.config\.ts must not alias isolated draft/u);
});

test("rejects HTML module entry points and does not exclude a copied verifier basename", () => {
  const root = createFixture();
  write(root, "apps/web/index.html", [
    "<script type=module>",
    "  import \"../../packages/ziwei-doushu-contracts-draft/src/index.ts\";",
    "</script>",
    "<script>import('@hakimi/' + 'western-astrology-contracts-draft')</script>",
    "<script type=module src=../../packages/ziwei-doushu-contracts-draft/src/index.ts></script>",
    "<link rel=\"modulepreload\" href=\"../../packages/western-astrology-contracts-draft/src/index.ts\">"
  ].join("\n"));
  write(root, "content/verify-system-contract-draft-boundaries.mjs", "import \"@hakimi/ziwei-doushu-contracts-draft\";\n");
  const failures = verifySystemContractDraftBoundaries(root).join("\n");
  assert.match(failures, /apps\/web\/index\.html resolves into isolated draft/u);
  assert.match(failures, /apps\/web\/index\.html uses non-literal dynamic import module loading/u);
  assert.match(failures, /content\/verify-system-contract-draft-boundaries\.mjs imports isolated draft/u);
});

test("rejects dependencies declared by package manifests outside apps and packages", () => {
  const root = createFixture();
  write(root, "tools/package.json", json({
    name: "fixture-tool",
    version: "1.0.0",
    dependencies: { "@hakimi/ziwei-doushu-contracts-draft": "workspace:*" }
  }));
  expectFailure(root, /tools\/package\.json declares forbidden dependencies entry/u);
});

test("rejects drift in closure resolved URLs, requested edges, and root overrides", () => {
  const resolvedRoot = createFixture();
  const resolvedLockPath = path.join(resolvedRoot, "package-lock.json");
  const resolvedLock = JSON.parse(fs.readFileSync(resolvedLockPath, "utf8"));
  resolvedLock.packages["node_modules/iztro"].resolved = "https://registry.npmjs.org/iztro/-/iztro-2.5.8-tampered.tgz";
  write(resolvedRoot, "package-lock.json", json(resolvedLock));
  expectFailure(resolvedRoot, /version\/resolved\/integrity/u);

  const edgeRoot = createFixture();
  const edgeLockPath = path.join(edgeRoot, "package-lock.json");
  const edgeLock = JSON.parse(fs.readFileSync(edgeLockPath, "utf8"));
  edgeLock.packages["node_modules/iztro"].dependencies.dayjs = "^1.0.0";
  write(edgeRoot, "package-lock.json", json(edgeLock));
  expectFailure(edgeRoot, /exact requested edges/u);

  const overrideRoot = createFixture();
  const rootManifest = JSON.parse(fs.readFileSync(path.join(overrideRoot, "package.json"), "utf8"));
  rootManifest.overrides.dayjs = "1.11.20";
  write(overrideRoot, "package.json", json(rootManifest));
  expectFailure(overrideRoot, /root overrides must freeze dayjs@1\.11\.21/u);
});

test("direct workspace Vite builds retain the gate and reject a resolved alias into a draft", async () => {
  const configPath = path.resolve(workspaceRoot, "apps/web/vite.config.ts");
  const resolved = await resolveConfig({ configFile: configPath, logLevel: "silent" }, "build");
  assert.ok(resolved.plugins.some((plugin) => plugin.name === "hakimi-isolated-system-contract-draft-boundary"));

  const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, configPath);
  assert.ok(loaded);
  loaded.config.resolve ??= {};
  const replacement = path.resolve(workspaceRoot, "packages/ziwei-doushu-contracts-draft/src/index.ts");
  const existingAliases = loaded.config.resolve.alias ?? {};
  loaded.config.resolve.alias = Array.isArray(existingAliases)
    ? [...existingAliases, { find: "#draft-boundary-probe", replacement }]
    : { ...existingAliases, "#draft-boundary-probe": replacement };

  await assert.rejects(
    resolveConfig({ ...loaded.config, configFile: false, logLevel: "silent" }, "build"),
    /must not resolve into isolated system draft/u
  );
});
