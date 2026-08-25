import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS,
  HISTORICAL_RUNTIME_VITE_ALIASES,
  REVIEWED_RUNTIME_CLOSURE_SCHEMA_BYTE_LENGTH,
  REVIEWED_RUNTIME_CLOSURE_SCHEMA_SHA256,
  aggregateInstalledPackageTree,
  analyzeRuntimeModuleDependencies,
  assertCanonicalRelativePath,
  assertRuntimeClosureAttestationShape,
  buildRuntimeClosureAttestation,
  extractHistoricalRuntimeViteAliases,
  parseCliArguments,
  parseCliMode,
  verifyBundleScriptGateContracts,
  verifyBundleVariantUsesBaseConfig,
  verifyCheckedInSchema,
  verifyAttestationAgainstCurrentState,
  verifyHistoricalNatalRuntimeClosure,
  verifyResolvedHistoricalRuntimeAliasResolutions,
  verifyResolvedHistoricalRuntimeAliases,
  verifyRuntimeLfCheckoutPolicySource,
  writeRuntimeClosureAttestation
} from "./verify-historical-natal-runtime-closure.mjs";

const EXTERNAL_A_SRI = `sha512-${Buffer.alloc(64, 0x11).toString("base64")}`;
const EXTERNAL_B_SRI = `sha512-${Buffer.alloc(64, 0x22).toString("base64")}`;
const PRODUCT_WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function writeUtf8(filePath, source) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source.endsWith("\n") ? source : `${source}\n`, "utf8");
}

function writeJson(filePath, value) {
  writeUtf8(filePath, JSON.stringify(value, null, 2));
}

function createFixture() {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "hakimi-runtime-closure-"));
  const resolve = (relativePath) => path.resolve(workspaceRoot, ...relativePath.split("/"));
  const sources = {
    kernel: [
      'import { helper } from "./helper";',
      'import { dependency } from "@fixture/dependency";',
      'import external from "external-alias/subpath.js";',
      "export const result = [helper, dependency, external];",
      ""
    ].join("\n"),
    helper: "export const helper = 1;\n",
    dependency: [
      'import external from "external-b";',
      'export const deferred = import("./lazy.ts");',
      "export const dependency = external;",
      ""
    ].join("\n"),
    lazy: "export const lazy = true;\n"
  };

  writeJson(resolve("packages/root/package.json"), {
    name: "@fixture/root",
    version: "1.0.0",
    type: "module",
    exports: "./src/index.ts",
    dependencies: {
      "@fixture/dependency": "*",
      "external-alias": "npm:external-a@1.0.0"
    }
  });
  writeUtf8(resolve("packages/root/src/index.ts"), "export const currentEntry = true;\n");
  writeUtf8(resolve("packages/root/src/kernel.ts"), sources.kernel);
  writeUtf8(resolve("packages/root/src/helper.ts"), sources.helper);

  writeJson(resolve("packages/dependency/package.json"), {
    name: "@fixture/dependency",
    version: "1.0.0",
    type: "module",
    exports: "./src/index.ts",
    dependencies: {
      "external-b": "2.0.0"
    }
  });
  writeUtf8(resolve("packages/dependency/src/index.ts"), sources.dependency);
  writeUtf8(resolve("packages/dependency/src/lazy.ts"), sources.lazy);

  writeJson(resolve("node_modules/external-alias/package.json"), {
    name: "external-a",
    version: "1.0.0",
    dependencies: {
      "external-b": "^2.0.0"
    }
  });
  writeUtf8(resolve("node_modules/external-alias/index.js"), "export default 1;\n");
  writeJson(resolve("node_modules/external-b/package.json"), {
    name: "external-b",
    version: "2.0.0"
  });
  writeUtf8(resolve("node_modules/external-b/index.js"), "export default 2;\n");

  writeJson(resolve("package-lock.json"), {
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "packages/root": {
        name: "@fixture/root",
        version: "1.0.0",
        dependencies: {
          "@fixture/dependency": "*",
          "external-alias": "npm:external-a@1.0.0"
        }
      },
      "packages/dependency": {
        name: "@fixture/dependency",
        version: "1.0.0",
        dependencies: {
          "external-b": "2.0.0"
        }
      },
      "node_modules/external-alias": {
        name: "external-a",
        version: "1.0.0",
        resolved: "https://registry.npmjs.org/external-a/-/external-a-1.0.0.tgz",
        integrity: EXTERNAL_A_SRI,
        dependencies: {
          "external-b": "^2.0.0"
        }
      },
      "node_modules/external-b": {
        version: "2.0.0",
        resolved: "https://registry.npmjs.org/external-b/-/external-b-2.0.0.tgz",
        integrity: EXTERNAL_B_SRI
      }
    }
  });
  mkdirSync(resolve("evidence"), { recursive: true });

  const buildOptions = {
    workspaceRoot,
    roots: ["packages/root/src/kernel.ts"],
    expectedWorkspaceSourcePaths: [
      "packages/dependency/src/index.ts",
      "packages/dependency/src/lazy.ts",
      "packages/root/src/helper.ts",
      "packages/root/src/kernel.ts"
    ],
    expectedWorkspaceManifestPaths: [
      "packages/dependency/package.json",
      "packages/root/package.json"
    ],
    expectedExternalInstallPaths: [
      "node_modules/external-alias",
      "node_modules/external-b"
    ],
    bundleResolverEvidence: {
      fixtureOnly: "temp_runtime_closure_tests_do_not_replace_product_bundle_checks"
    }
  };
  return {
    workspaceRoot,
    resolve,
    sources,
    buildOptions,
    sidecarPath: "evidence/runtime-closure.json"
  };
}

function withFixture(run) {
  const fixture = createFixture();
  try {
    return run(fixture);
  } finally {
    rmSync(fixture.workspaceRoot, { recursive: true, force: true });
  }
}

async function withResolvedAliasFixture(run) {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "hakimi-resolved-aliases-"));
  try {
    const expectedTargets = {};
    const aliases = HISTORICAL_RUNTIME_VITE_ALIASES.map((specifier) => {
      const fileName = `${specifier.replaceAll("@", "at-").replaceAll("/", "-")}.ts`;
      const target = `targets/${fileName}`;
      const replacement = path.resolve(workspaceRoot, ...target.split("/"));
      writeUtf8(replacement, `export const id = ${JSON.stringify(specifier)};\n`);
      expectedTargets[specifier] = target;
      return {
        kind: "string",
        find: specifier,
        replacement,
        hasCustomResolver: false
      };
    });
    const resolutions = aliases.map((alias) => ({
      specifier: alias.find,
      resolvedId: alias.replacement,
      external: false
    }));
    return await run({ workspaceRoot, expectedTargets, aliases, resolutions });
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function writeFixtureSidecar(fixture) {
  return writeRuntimeClosureAttestation({
    ...fixture.buildOptions,
    sidecarPath: fixture.sidecarPath
  });
}

function verifyFixtureSidecar(fixture) {
  return verifyAttestationAgainstCurrentState({
    ...fixture.buildOptions,
    sidecarPath: fixture.sidecarPath,
    validateProductShape: false
  });
}

test("records literal dynamic imports but rejects computed imports and require", () => {
  assert.deepEqual(
    analyzeRuntimeModuleDependencies([
      'import value from "external";',
      'export { other } from "./other.ts";',
      'import type { TypeOnly } from "./types.ts";',
      'import { type OtherType } from "./other-types.ts";',
      'export type { ExportedType } from "./exported-types.ts";',
      'const lazy = import("./lazy.ts");',
      "void value; void lazy;",
      ""
    ].join("\n"), "module.ts"),
    [
      { kind: "static-import", specifier: "external" },
      { kind: "static-export", specifier: "./other.ts" },
      { kind: "dynamic-import", specifier: "./lazy.ts" }
    ]
  );
  assert.throws(
    () => analyzeRuntimeModuleDependencies("const name = './lazy.ts'; import(name);\n", "computed.ts"),
    /non-literal or empty dynamic import/u
  );
  assert.throws(
    () => analyzeRuntimeModuleDependencies("require/* decoy */('./lazy.ts');\n", "require.ts"),
    /must not use require/u
  );
});

test("rejects dot segments, duplicate separators, trailing separators, escapes, and backslashes", () => {
  for (const rejected of [
    "./packages/file.ts",
    "packages/./file.ts",
    "packages//file.ts",
    "packages/file.ts/",
    "packages/../file.ts",
    "../file.ts",
    "/packages/file.ts",
    "packages\\file.ts"
  ]) {
    assert.throws(() => assertCanonicalRelativePath(rejected, "fixture path"), /canonical|segment/u);
  }
  assert.equal(assertCanonicalRelativePath("packages/root/src/file.ts"), "packages/root/src/file.ts");
});

test("requires exact LF rules and rejects duplicate or case-fold-colliding paths", () => {
  assert.deepEqual(
    verifyRuntimeLfCheckoutPolicySource([
      "/packages/a.ts text eol=lf",
      "/packages/b.json text eol=lf",
      "/unrelated/path text eol=lf",
      ""
    ].join("\n"), ["packages/a.ts", "packages/b.json"]),
    { paths: ["packages/a.ts", "packages/b.json"], attributes: "text eol=lf" }
  );
  assert.throws(
    () => verifyRuntimeLfCheckoutPolicySource([
      "/packages/a.ts text eol=lf",
      "/PACKAGES/A.TS text eol=lf",
      ""
    ].join("\n"), ["packages/a.ts"]),
    /case-fold collision/u
  );
  assert.throws(
    () => verifyRuntimeLfCheckoutPolicySource("/packages/a.ts text=auto eol=lf\n", ["packages/a.ts"]),
    /LF policy expected/u
  );
});

test("builds, writes, and checks a closed fixture including a literal dynamic edge and npm alias", () => withFixture((fixture) => {
  const written = writeFixtureSidecar(fixture);
  const checked = verifyFixtureSidecar(fixture);
  assert.deepEqual(checked, written);
  assert.equal(written.workspaceSources.length, 4);
  assert.equal(written.workspaceManifests.length, 2);
  assert.equal(written.externalPackages.length, 2);
  const dependencySource = written.workspaceSources.find((entry) => entry.path === "packages/dependency/src/index.ts");
  assert.ok(dependencySource.edges.some((edge) =>
    edge.kind === "dynamic-import" && edge.specifier === "./lazy.ts" && edge.target === "packages/dependency/src/lazy.ts"
  ));
  const alias = written.externalPackages.find((entry) => entry.installPath === "node_modules/external-alias");
  assert.equal(alias.requestName, "external-alias");
  assert.equal(alias.packageName, "external-a");
}));

test("detects workspace byte tampering and an added import edge without changing the closure set", () => withFixture((fixture) => {
  writeFixtureSidecar(fixture);
  writeUtf8(fixture.resolve("packages/root/src/kernel.ts"), `${fixture.sources.kernel}// byte tamper\n`);
  assert.throws(() => verifyFixtureSidecar(fixture), /checked-in sidecar does not match current state/u);

  writeUtf8(
    fixture.resolve("packages/root/src/kernel.ts"),
    `import secondExternal from "external-alias/other-subpath.js";\n${fixture.sources.kernel}\nvoid secondExternal;\n`
  );
  assert.throws(() => verifyFixtureSidecar(fixture), /checked-in sidecar does not match current state/u);
}));

test("rejects a newly reached source and a deleted reached source", () => {
  withFixture((fixture) => {
    writeUtf8(fixture.resolve("packages/root/src/added.ts"), "export const added = true;\n");
    writeUtf8(
      fixture.resolve("packages/root/src/kernel.ts"),
      `import "./added";\n${fixture.sources.kernel}`
    );
    assert.throws(
      () => buildRuntimeClosureAttestation(fixture.buildOptions),
      /workspace runtime source closure expected/u
    );
  });
  withFixture((fixture) => {
    unlinkSync(fixture.resolve("packages/root/src/helper.ts"));
    assert.throws(
      () => buildRuntimeClosureAttestation(fixture.buildOptions),
      /resolved to 0 candidates/u
    );
  });
});

test("rejects ambiguous relative resolution", () => withFixture((fixture) => {
  writeUtf8(fixture.resolve("packages/root/src/helper/index.ts"), "export const helper = 2;\n");
  assert.throws(
    () => buildRuntimeClosureAttestation(fixture.buildOptions),
    /resolved to 2 candidates/u
  );
}));

test("detects lock SRI drift and installed tree drift", () => {
  withFixture((fixture) => {
    writeFixtureSidecar(fixture);
    const lockPath = fixture.resolve("package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.packages["node_modules/external-b"].integrity = `sha512-${Buffer.alloc(64, 0x33).toString("base64")}`;
    writeJson(lockPath, lock);
    assert.throws(() => verifyFixtureSidecar(fixture), /checked-in sidecar does not match current state/u);
  });
  withFixture((fixture) => {
    writeFixtureSidecar(fixture);
    writeUtf8(fixture.resolve("node_modules/external-alias/added.js"), "export default 99;\n");
    assert.throws(() => verifyFixtureSidecar(fixture), /checked-in sidecar does not match current state/u);
  });
  withFixture((fixture) => {
    writeFixtureSidecar(fixture);
    unlinkSync(fixture.resolve("node_modules/external-alias/index.js"));
    assert.throws(() => verifyFixtureSidecar(fixture), /checked-in sidecar does not match current state/u);
  });
});

test("re-derives npm alias identity and exact alias version from importer and lock data", () => {
  withFixture((fixture) => {
    const lockPath = fixture.resolve("package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    delete lock.packages["node_modules/external-alias"].name;
    writeJson(lockPath, lock);
    assert.throws(
      () => buildRuntimeClosureAttestation(fixture.buildOptions),
      /alias lock entry must name installed package/u
    );
  });
  withFixture((fixture) => {
    const manifestPath = fixture.resolve("packages/root/package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.dependencies["external-alias"] = "npm:external-a@1.0.1";
    writeJson(manifestPath, manifest);
    const lockPath = fixture.resolve("package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.packages["packages/root"].dependencies["external-alias"] = "npm:external-a@1.0.1";
    writeJson(lockPath, lock);
    assert.throws(
      () => buildRuntimeClosureAttestation(fixture.buildOptions),
      /alias must pin exact installed version/u
    );
  });
});

test("requires workspace package-lock importer identity and dependency edges to match exactly", () => withFixture((fixture) => {
  const lockPath = fixture.resolve("package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.packages["packages/root"].dependencies["external-alias"] = "npm:external-a@1.0.1";
  writeJson(lockPath, lock);
  assert.throws(
    () => buildRuntimeClosureAttestation(fixture.buildOptions),
    /workspace lock importer does not exactly match/u
  );
}));

test("installed tree hashing is creation-order independent and content sensitive", () => {
  const root = mkdtempSync(path.join(tmpdir(), "hakimi-tree-framing-"));
  try {
    const left = path.join(root, "left");
    const right = path.join(root, "right");
    mkdirSync(left);
    mkdirSync(right);
    writeUtf8(path.join(left, "b.txt"), "second\n");
    writeUtf8(path.join(left, "a.txt"), "first\n");
    writeUtf8(path.join(right, "a.txt"), "first\n");
    writeUtf8(path.join(right, "b.txt"), "second\n");
    const leftTree = aggregateInstalledPackageTree(left);
    const rightTree = aggregateInstalledPackageTree(right);
    assert.deepEqual(leftTree, rightTree);
    writeUtf8(path.join(right, "b.txt"), "changed\n");
    assert.notEqual(aggregateInstalledPackageTree(right).sha256, leftTree.sha256);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects symlink or junction entries in an installed package tree", (context) => {
  const root = mkdtempSync(path.join(tmpdir(), "hakimi-tree-link-"));
  try {
    const packageRoot = path.join(root, "package");
    const target = path.join(root, "target");
    mkdirSync(packageRoot);
    mkdirSync(target);
    writeUtf8(path.join(packageRoot, "package.json"), "{}\n");
    writeUtf8(path.join(target, "payload.txt"), "payload\n");
    try {
      symlinkSync(target, path.join(packageRoot, "linked"), process.platform === "win32" ? "junction" : "dir");
    } catch (cause) {
      if (cause && typeof cause === "object" && (cause.code === "EPERM" || cause.code === "EACCES")) {
        context.skip(`platform denied symlink fixture: ${cause.code}`);
        return;
      }
      throw cause;
    }
    assert.throws(() => aggregateInstalledPackageTree(packageRoot), /symlink\/reparse point/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a symlinked workspace source target", (context) => withFixture((fixture) => {
  const helperPath = fixture.resolve("packages/root/src/helper.ts");
  const physicalPath = fixture.resolve("packages/root/src/physical-helper.ts");
  writeUtf8(physicalPath, fixture.sources.helper);
  unlinkSync(helperPath);
  try {
    symlinkSync(physicalPath, helperPath, "file");
  } catch (cause) {
    if (cause && typeof cause === "object" && (cause.code === "EPERM" || cause.code === "EACCES")) {
      context.skip(`platform denied workspace symlink fixture: ${cause.code}`);
      return;
    }
    throw cause;
  }
  assert.throws(
    () => buildRuntimeClosureAttestation(fixture.buildOptions),
    /symlink\/reparse point/u
  );
}));

test("sidecar shape rejects reordered, duplicate, case-fold-colliding, and dangling arrays", () => {
  const baseline = buildRuntimeClosureAttestation();
  const sourcePaths = new Set(baseline.workspaceSources.map((entry) => entry.path));
  assert.ok(baseline.bundleResolver.aliases.every((alias) => sourcePaths.has(alias.target)));
  const reordered = structuredClone(baseline);
  reordered.workspaceSources.reverse();
  assert.throws(() => assertRuntimeClosureAttestationShape(reordered), /canonical sorted order/u);

  const duplicateEdge = structuredClone(baseline);
  duplicateEdge.workspaceSources[0].edges.push(structuredClone(duplicateEdge.workspaceSources[0].edges[0]));
  assert.throws(() => assertRuntimeClosureAttestationShape(duplicateEdge), /case-fold collision/u);

  const caseCollision = structuredClone(baseline);
  const copy = structuredClone(caseCollision.workspaceSources[0]);
  copy.path = copy.path.toUpperCase();
  caseCollision.workspaceSources.push(copy);
  caseCollision.workspaceSources.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  assert.throws(() => assertRuntimeClosureAttestationShape(caseCollision), /case-fold collision/u);

  const dangling = structuredClone(baseline);
  dangling.workspaceSources[0].packageManifestPath = "packages/missing/package.json";
  assert.throws(() => assertRuntimeClosureAttestationShape(dangling), /missing owner manifest/u);

  const missingBaziAliasTarget = structuredClone(baseline);
  missingBaziAliasTarget.roots = missingBaziAliasTarget.roots.filter(
    (root) => root !== "packages/bazi-core/src/index.ts"
  );
  missingBaziAliasTarget.workspaceSources = missingBaziAliasTarget.workspaceSources.filter(
    (source) => source.path !== "packages/bazi-core/src/index.ts"
  );
  assert.throws(
    () => assertRuntimeClosureAttestationShape(missingBaziAliasTarget),
    /bundle alias @hakimi\/bazi-core target is not in workspaceSources/u
  );
});

test("pins the checked-in LF schema bytes before trusting its declared shape", () => {
  const schemaRelativePath = "packages/bazi-core/historical-natal-runtime-closure-v1.schema.json";
  const actual = verifyCheckedInSchema(PRODUCT_WORKSPACE_ROOT);
  assert.equal(actual.lfUtf8Sha256, REVIEWED_RUNTIME_CLOSURE_SCHEMA_SHA256);
  assert.equal(actual.byteLength, REVIEWED_RUNTIME_CLOSURE_SCHEMA_BYTE_LENGTH);

  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "hakimi-schema-pin-"));
  try {
    const schemaBytes = readFileSync(path.resolve(PRODUCT_WORKSPACE_ROOT, ...schemaRelativePath.split("/")));
    const schemaPath = path.resolve(workspaceRoot, ...schemaRelativePath.split("/"));
    mkdirSync(path.dirname(schemaPath), { recursive: true });
    writeFileSync(schemaPath, schemaBytes);
    assert.equal(verifyCheckedInSchema(workspaceRoot).lfUtf8Sha256, REVIEWED_RUNTIME_CLOSURE_SCHEMA_SHA256);
    const tamperedSchema = Buffer.from(
      schemaBytes.toString("utf8").replace(
        "Historical natal 0.4.0 current-checkout runtime closure attestation",
        "historical natal 0.4.0 current-checkout runtime closure attestation"
      ),
      "utf8"
    );
    assert.equal(tamperedSchema.byteLength, schemaBytes.byteLength);
    writeFileSync(schemaPath, tamperedSchema);
    assert.throws(() => verifyCheckedInSchema(workspaceRoot), /reviewed LF schema expected/u);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});

test("accepts only direct reviewed Vite variant inheritance and no resolve override", () => {
  const baseConfigPath = "apps/web/vite.config.ts";
  const baseConfigSource = readFileSync(
    path.resolve(PRODUCT_WORKSPACE_ROOT, ...baseConfigPath.split("/")),
    "utf8"
  );
  assert.equal(
    extractHistoricalRuntimeViteAliases(baseConfigSource, baseConfigPath).length,
    HISTORICAL_RUNTIME_VITE_ALIASES.length
  );
  assert.throws(
    () => extractHistoricalRuntimeViteAliases(
      baseConfigSource.replace("      historicalNatalRuntimeClosurePlugin(),\n", ""),
      baseConfigPath
    ),
    /must install exactly one historicalNatalRuntimeClosurePlugin/u
  );
  for (const relativePath of HISTORICAL_RUNTIME_BUNDLE_CONFIG_PATHS) {
    if (relativePath === "apps/web/vite.config.ts") continue;
    const source = readFileSync(path.resolve(PRODUCT_WORKSPACE_ROOT, ...relativePath.split("/")), "utf8");
    assert.ok(["default", "createWebViteConfig"].includes(
      verifyBundleVariantUsesBaseConfig(source, relativePath)
    ));
  }

  assert.equal(verifyBundleVariantUsesBaseConfig([
    'import { createWebViteConfig } from "./vite.config";',
    "export default createWebViteConfig({});",
    ""
  ].join("\n"), "direct.ts"), "createWebViteConfig");
  assert.equal(verifyBundleVariantUsesBaseConfig([
    'import { defineConfig, mergeConfig } from "vite";',
    'import baseConfig from "./vite.config";',
    "export default mergeConfig(baseConfig, defineConfig({ build: {} }));",
    ""
  ].join("\n"), "merge.ts"), "default");

  assert.throws(() => verifyBundleVariantUsesBaseConfig([
    'import { defineConfig, mergeConfig } from "vite";',
    'import baseConfig from "./vite.config";',
    "const wrapped = () => baseConfig;",
    "export default mergeConfig(wrapped(), defineConfig({}));",
    ""
  ].join("\n"), "opaque.ts"), /first argument must be its exact/u);
  assert.throws(() => verifyBundleVariantUsesBaseConfig([
    'import { defineConfig, mergeConfig } from "vite";',
    'import baseConfig from "./vite.config";',
    'export default mergeConfig(baseConfig, defineConfig({ resolve: { alias: { "@hakimi/time-core": "sentinel.ts" } } }));',
    ""
  ].join("\n"), "override.ts"), /must not override resolve/u);
  assert.throws(() => verifyBundleVariantUsesBaseConfig([
    'import { defineConfig, mergeConfig } from "vite";',
    'import baseConfig from "./vite.config";',
    "const extra = {};",
    "export default mergeConfig(baseConfig, defineConfig({ ...extra }));",
    ""
  ].join("\n"), "spread.ts"), /must not use spread/u);
});

test("binds final Vite aliases to attested physical sources and rejects competitors", () => withResolvedAliasFixture((fixture) => {
  assert.equal(
    verifyResolvedHistoricalRuntimeAliases(
      fixture.aliases,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ).length,
    HISTORICAL_RUNTIME_VITE_ALIASES.length
  );

  const sentinelPath = path.resolve(fixture.workspaceRoot, "targets/sentinel.ts");
  writeUtf8(sentinelPath, "export const sentinel = true;\n");
  const drifted = structuredClone(fixture.aliases);
  drifted[0].replacement = sentinelPath;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(drifted, fixture.workspaceRoot, fixture.expectedTargets),
    /expected .* got/u
  );

  const prefixCompetitor = [
    { kind: "string", find: "@hakimi", replacement: sentinelPath, hasCustomResolver: false },
    ...fixture.aliases
  ];
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(prefixCompetitor, fixture.workspaceRoot, fixture.expectedTargets),
    /prefix\/RegExp competitors/u
  );

  const regexpCompetitor = [
    { kind: "regexp", source: "^@hakimi/", flags: "u", replacement: sentinelPath, hasCustomResolver: false },
    ...fixture.aliases
  ];
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(regexpCompetitor, fixture.workspaceRoot, fixture.expectedTargets),
    /prefix\/RegExp competitors/u
  );

  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(
      [structuredClone(fixture.aliases[0]), ...fixture.aliases],
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /exactly one exact string entry/u
  );

  const customResolver = structuredClone(fixture.aliases);
  customResolver[0].hasCustomResolver = true;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(customResolver, fixture.workspaceRoot, fixture.expectedTargets),
    /without customResolver/u
  );

  const relativeReplacement = structuredClone(fixture.aliases);
  relativeReplacement[0].replacement = fixture.expectedTargets[relativeReplacement[0].find];
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliases(relativeReplacement, fixture.workspaceRoot, fixture.expectedTargets),
    /replacement must be an absolute path/u
  );
}));

test("binds all actual Vite alias resolutions to attested physical sources", () => withResolvedAliasFixture((fixture) => {
  assert.deepEqual(
    verifyResolvedHistoricalRuntimeAliasResolutions(
      fixture.resolutions,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    HISTORICAL_RUNTIME_VITE_ALIASES.map((specifier) => ({
      specifier,
      target: fixture.expectedTargets[specifier]
    }))
  );

  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      fixture.resolutions.slice(1),
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /resolution specifiers expected/u
  );
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      [structuredClone(fixture.resolutions[0]), ...fixture.resolutions],
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /case-fold collision|resolution specifiers expected/u
  );

  const nullResolution = structuredClone(fixture.resolutions);
  nullResolution[0].resolvedId = null;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      nullResolution,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /resolvedId must not be null/u
  );

  const externalResolution = structuredClone(fixture.resolutions);
  externalResolution[0].external = true;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      externalResolution,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /must not be external/u
  );

  for (const rejectedId of [
    "virtual:historical-runtime-target",
    "/@id/__x00__historical-runtime-target"
  ]) {
    const virtualResolution = structuredClone(fixture.resolutions);
    virtualResolution[0].resolvedId = rejectedId;
    assert.throws(
      () => verifyResolvedHistoricalRuntimeAliasResolutions(
        virtualResolution,
        fixture.workspaceRoot,
        fixture.expectedTargets
      ),
      /must not be virtual/u
    );
  }

  const relativeResolution = structuredClone(fixture.resolutions);
  relativeResolution[0].resolvedId = fixture.expectedTargets[relativeResolution[0].specifier];
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      relativeResolution,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /must be an absolute path/u
  );

  const nulResolution = structuredClone(fixture.resolutions);
  nulResolution[0].resolvedId = `${nulResolution[0].resolvedId}\0suffix`;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      nulResolution,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /must not contain NUL/u
  );

  for (const suffix of ["?raw", "#fragment"]) {
    const decoratedResolution = structuredClone(fixture.resolutions);
    decoratedResolution[0].resolvedId += suffix;
    assert.throws(
      () => verifyResolvedHistoricalRuntimeAliasResolutions(
        decoratedResolution,
        fixture.workspaceRoot,
        fixture.expectedTargets
      ),
      /must not contain a query or fragment/u
    );
  }

  const sentinelPath = path.resolve(fixture.workspaceRoot, "targets/resolution-sentinel.ts");
  writeUtf8(sentinelPath, "export const sentinel = true;\n");
  const driftedResolution = structuredClone(fixture.resolutions);
  driftedResolution[0].resolvedId = sentinelPath;
  assert.throws(
    () => verifyResolvedHistoricalRuntimeAliasResolutions(
      driftedResolution,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ),
    /expected .* got/u
  );
}));

test("captures protected alias resolutions through the installed Web Vite lifecycle", () => withResolvedAliasFixture(async (fixture) => {
  const requireFromWeb = createRequire(path.resolve(PRODUCT_WORKSPACE_ROOT, "apps/web/package.json"));
  const vite = requireFromWeb("vite");
  assert.equal(vite.version, "7.3.6");

  const virtualEntryRequest = "virtual:historical-runtime-alias-resolution-entry";
  const virtualEntryId = `\0${virtualEntryRequest}`;
  const capturedResolutions = [];
  await vite.build({
    configFile: false,
    root: fixture.workspaceRoot,
    logLevel: "silent",
    resolve: {
      alias: fixture.aliases.map((alias) => ({
        find: alias.find,
        replacement: alias.replacement
      }))
    },
    plugins: [{
      name: "historical-runtime-alias-resolution-test",
      resolveId(source) {
        return source === virtualEntryRequest ? virtualEntryId : null;
      },
      load(id) {
        if (id !== virtualEntryId) return null;
        return [
          ...HISTORICAL_RUNTIME_VITE_ALIASES.map((specifier) => `import ${JSON.stringify(specifier)};`),
          "export default null;",
          ""
        ].join("\n");
      },
      async buildStart() {
        for (const specifier of HISTORICAL_RUNTIME_VITE_ALIASES) {
          const resolved = await this.resolve(specifier, virtualEntryId, { skipSelf: true });
          capturedResolutions.push({
            specifier,
            resolvedId: resolved?.id ?? null,
            external: resolved?.external === true
          });
        }
      }
    }],
    build: {
      write: false,
      rollupOptions: {
        input: virtualEntryRequest
      }
    }
  });

  assert.equal(capturedResolutions.length, HISTORICAL_RUNTIME_VITE_ALIASES.length);
  assert.equal(
    verifyResolvedHistoricalRuntimeAliasResolutions(
      capturedResolutions,
      fixture.workspaceRoot,
      fixture.expectedTargets
    ).length,
    HISTORICAL_RUNTIME_VITE_ALIASES.length
  );
}));

test("requires prehooks for every reviewed root and direct Web bundle script", () => {
  const rootManifest = JSON.parse(readFileSync(path.resolve(PRODUCT_WORKSPACE_ROOT, "package.json"), "utf8"));
  const webManifest = JSON.parse(readFileSync(path.resolve(PRODUCT_WORKSPACE_ROOT, "apps/web/package.json"), "utf8"));
  const contracts = verifyBundleScriptGateContracts(rootManifest, webManifest);
  assert.ok(contracts.rootBundleScripts.includes("build"));
  assert.ok(contracts.webBundleScripts.includes("build:e2e"));

  const missingPrehook = structuredClone(webManifest);
  delete missingPrehook.scripts["prebuild:e2e"];
  assert.throws(
    () => verifyBundleScriptGateContracts(rootManifest, missingPrehook),
    /build:e2e must have exact prebuild:e2e/u
  );

  const unreviewed = structuredClone(webManifest);
  unreviewed.scripts["build:unreviewed"] = "vite build --config vite.unreviewed.config.ts";
  unreviewed.scripts["prebuild:unreviewed"] = "npm --prefix ../.. run check:historical-natal-build-attestation";
  assert.throws(
    () => verifyBundleScriptGateContracts(rootManifest, unreviewed),
    /direct Web Vite bundle scripts expected/u
  );

  const recursive = structuredClone(rootManifest);
  recursive.scripts.prebuild = `${recursive.scripts.prebuild} && npm run build`;
  assert.throws(
    () => verifyBundleScriptGateContracts(recursive, webManifest),
    /must not recurse into build/u
  );
});

test("rejects duplicate raw JSON keys before semantic sidecar validation", () => withFixture((fixture) => {
  writeFixtureSidecar(fixture);
  const sidecarFile = fixture.resolve(fixture.sidecarPath);
  const source = readFileSync(sidecarFile, "utf8").replace(
    '  "schemaVersion": "1.0.0",',
    '  "schemaVersion": "1.0.0",\n  "schemaVersion": "1.0.0",'
  );
  writeFileSync(sidecarFile, source, "utf8");
  assert.throws(() => verifyFixtureSidecar(fixture), /duplicate JSON object key "schemaVersion"/u);
}));

test("CLI defaults to check and requires an explicit write flag", () => {
  assert.equal(parseCliMode([]), "check");
  assert.equal(parseCliMode(["--check"]), "check");
  assert.equal(parseCliMode(["--write"]), "write");
  assert.throws(() => parseCliMode(["--write", "--check"]), /usage/u);
  assert.throws(() => parseCliMode(["--unknown"]), /usage/u);
  assert.deepEqual(
    parseCliArguments([
      "--check",
      "--resolved-vite-aliases-json",
      "[]",
      "--resolved-vite-alias-resolutions-json",
      "[]"
    ]),
    { mode: "check", resolvedViteAliases: [], resolvedViteAliasResolutions: [] }
  );
  assert.deepEqual(
    parseCliArguments([
      "--check",
      "--resolved-vite-alias-resolutions-json",
      "[]",
      "--resolved-vite-aliases-json",
      "[]"
    ]),
    { mode: "check", resolvedViteAliases: [], resolvedViteAliasResolutions: [] }
  );
  assert.throws(
    () => parseCliArguments(["--check", "--resolved-vite-aliases-json", "[]"]),
    /must be provided together/u
  );
  assert.throws(
    () => parseCliArguments(["--check", "--resolved-vite-alias-resolutions-json", "[]"]),
    /must be provided together/u
  );
  assert.throws(
    () => parseCliArguments([
      "--check",
      "--resolved-vite-aliases-json",
      "{",
      "--resolved-vite-alias-resolutions-json",
      "[]"
    ]),
    /cannot be inspected for duplicate JSON keys|not valid JSON/u
  );
  assert.throws(
    () => parseCliArguments([
      "--check",
      "--resolved-vite-aliases-json",
      '[{"kind":"string","kind":"regexp"}]',
      "--resolved-vite-alias-resolutions-json",
      "[]"
    ]),
    /duplicate JSON object key "kind"/u
  );
  assert.throws(
    () => parseCliArguments([
      "--check",
      "--resolved-vite-aliases-json",
      "[]",
      "--resolved-vite-alias-resolutions-json",
      '[{"specifier":"@hakimi/bazi-core","resolvedId":"one","resolvedId":"two","external":false}]'
    ]),
    /duplicate JSON object key "resolvedId"/u
  );
  assert.throws(
    () => parseCliArguments(["--check", "--resolved-vite-aliases-json", " ".repeat(65_537)]),
    /exceeds 65536/u
  );
  assert.throws(
    () => verifyHistoricalNatalRuntimeClosure({ resolvedViteAliases: [] }),
    /must be provided together/u
  );
  assert.throws(
    () => verifyHistoricalNatalRuntimeClosure({ resolvedViteAliasResolutions: [] }),
    /must be provided together/u
  );
  assert.throws(
    () => verifyHistoricalNatalRuntimeClosure({
      mode: "write",
      resolvedViteAliases: [],
      resolvedViteAliasResolutions: []
    }),
    /write mode must not accept/u
  );
});
