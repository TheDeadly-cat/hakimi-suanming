#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const PACKAGE_LOCK_FILE = "package-lock.json";
const SBOM_FILE = "docs/sbom.cyclonedx.json";
const NOTICES_FILE = "THIRD_PARTY_NOTICES.md";
const CYCLONEDX_SPEC_VERSION = "1.5";
const MANUAL_REVIEW_LICENSE_PATTERN = /(?:^|[^A-Za-z0-9])(?:MPL(?:-|$)|CC(?:-|$)|Creative Commons|BlueOak|EPL(?:-|$)|CDDL(?:-|$)|LGPL(?:-|$)|GPL(?:-|$)|AGPL(?:-|$)|SSPL(?:-|$)|BUSL(?:-|$)|BSL(?:-|$)|EUPL(?:-|$)|OSL(?:-|$)|CPAL(?:-|$)|LicenseRef-|SEE LICENSE)/iu;
const DISALLOWED_LICENSE_PATTERN = /^(?:UNLICENSED|NONE|NOASSERTION|UNKNOWN)$/iu;
const STANDARD_NOTICE_LICENSES = new Set([
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MIT",
  "MIT-0",
  "Zlib"
]);

class DependencyAuditError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "DependencyAuditError";
  }
}

function normalizeLockPath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
}

function isNodeModulesPath(packagePath) {
  return packagePath === "node_modules" || packagePath.startsWith("node_modules/") || packagePath.includes("/node_modules/");
}

function packageNameFromPath(packagePath) {
  const marker = "node_modules/";
  const markerIndex = packagePath.lastIndexOf(marker);
  if (markerIndex < 0) return null;
  const suffix = packagePath.slice(markerIndex + marker.length);
  const parts = suffix.split("/");
  if (parts[0]?.startsWith("@")) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] || null;
}

function packageName(packagePath, entry) {
  const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : packageNameFromPath(packagePath);
  if (!name) throw new DependencyAuditError(`Cannot determine package name for lock entry ${packagePath}.`);
  return name;
}

function isHakimiWorkspaceSource(packagePath, entry) {
  return !isNodeModulesPath(packagePath) && packageName(packagePath, entry).startsWith("@hakimi/");
}

function dereferencePackagePath(packages, packagePath) {
  const entry = packages[packagePath];
  if (!entry) throw new DependencyAuditError(`Lock entry ${packagePath} does not exist.`);
  if (entry.link !== true) return packagePath;
  if (typeof entry.resolved !== "string" || !entry.resolved.trim()) {
    throw new DependencyAuditError(`Workspace link ${packagePath} has no resolved source path.`);
  }
  const resolved = normalizeLockPath(entry.resolved);
  if (!packages[resolved]) {
    throw new DependencyAuditError(`Workspace link ${packagePath} resolves to missing lock entry ${resolved}.`);
  }
  return resolved;
}

function dependencyCandidates(fromPackagePath, dependencyName) {
  const candidates = [];
  let cursor = normalizeLockPath(fromPackagePath);
  while (true) {
    candidates.push(cursor ? `${cursor}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`);
    if (!cursor) break;
    const parent = path.posix.dirname(cursor);
    cursor = parent === "." ? "" : parent;
  }
  return [...new Set(candidates)];
}

function resolveDependencyPath(packages, fromPackagePath, dependencyName) {
  for (const candidate of dependencyCandidates(fromPackagePath, dependencyName)) {
    if (packages[candidate]) return dereferencePackagePath(packages, candidate);
  }
  return null;
}

function runtimeDependencyEdges(entry) {
  const edges = new Map();
  for (const dependencyName of Object.keys(entry.dependencies ?? {}).sort()) {
    edges.set(dependencyName, { optional: false, kind: "dependency" });
  }
  for (const dependencyName of Object.keys(entry.optionalDependencies ?? {}).sort()) {
    edges.set(dependencyName, { optional: true, kind: "optionalDependency" });
  }
  for (const dependencyName of Object.keys(entry.peerDependencies ?? {}).sort()) {
    const optional = entry.peerDependenciesMeta?.[dependencyName]?.optional === true;
    if (!edges.has(dependencyName)) edges.set(dependencyName, { optional, kind: "peerDependency" });
  }
  return [...edges.entries()].map(([name, details]) => ({ name, ...details }));
}

function applicationWorkspaceRoots(packages) {
  const roots = Object.keys(packages)
    .filter((packagePath) => packagePath.startsWith("apps/") && !isNodeModulesPath(packagePath))
    .filter((packagePath) => typeof packages[packagePath]?.name === "string")
    .sort();
  if (roots.length > 0) return roots;

  const fallback = Object.keys(packages)
    .filter((packagePath) => packagePath !== "" && !isNodeModulesPath(packagePath))
    .filter((packagePath) => packages[packagePath]?.name?.startsWith?.("@hakimi/"))
    .sort();
  if (fallback.length === 0) {
    throw new DependencyAuditError("package-lock does not contain an application workspace root.");
  }
  return fallback;
}

function validateLockfile(lock) {
  if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
    throw new DependencyAuditError("package-lock must contain a JSON object.");
  }
  if (lock.lockfileVersion !== 3) {
    throw new DependencyAuditError(`Expected package-lock v3, received ${String(lock.lockfileVersion)}.`);
  }
  if (!lock.packages || typeof lock.packages !== "object" || Array.isArray(lock.packages)) {
    throw new DependencyAuditError("package-lock v3 is missing its packages map.");
  }
  if (!lock.packages[""]) {
    throw new DependencyAuditError("package-lock v3 is missing its root package entry.");
  }
}

function requireLicense(name, version, entry) {
  if (typeof entry.license !== "string" || !entry.license.trim()) {
    throw new DependencyAuditError(`Runtime dependency ${name}@${version} is missing a declared license in package-lock.`);
  }
  const license = entry.license.trim();
  if (DISALLOWED_LICENSE_PATTERN.test(license)) {
    throw new DependencyAuditError(`Runtime dependency ${name}@${version} declares disallowed license value ${license}.`);
  }
  return license;
}

function licenseReview(license) {
  if (STANDARD_NOTICE_LICENSES.has(license)) {
    return {
      status: "standard_notice",
      reason: "Declared license is in the narrow standard-notice allowlist; this is not a compliance determination."
    };
  }
  if (MANUAL_REVIEW_LICENSE_PATTERN.test(license)) {
    return {
      status: "manual_review_required",
      reason: "Declared license belongs to a copyleft, content, special-purpose, or file-referenced family. Human review is required before distribution."
    };
  }
  return {
    status: "manual_review_required",
    reason: "Declared license is outside the narrow standard-notice allowlist. Human review is required before distribution."
  };
}

function npmPurl(name, version) {
  let encodedName;
  if (name.startsWith("@")) {
    const slash = name.indexOf("/");
    if (slash < 2 || slash === name.length - 1) {
      throw new DependencyAuditError(`Invalid scoped npm package name ${name}.`);
    }
    encodedName = `%40${encodeURIComponent(name.slice(1, slash))}/${encodeURIComponent(name.slice(slash + 1))}`;
  } else {
    encodedName = encodeURIComponent(name);
  }
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function integrityHash(integrity) {
  if (typeof integrity !== "string" || !integrity.trim()) return null;
  const algorithms = [
    ["sha512", "SHA-512"],
    ["sha384", "SHA-384"],
    ["sha256", "SHA-256"],
    ["sha1", "SHA-1"]
  ];
  const tokens = integrity.trim().split(/\s+/u);
  for (const [prefix, cycloneAlgorithm] of algorithms) {
    const token = tokens.find((value) => value.startsWith(`${prefix}-`));
    if (!token) continue;
    const encoded = token.slice(prefix.length + 1).split("?", 1)[0];
    try {
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length === 0 || bytes.toString("base64").replace(/=+$/u, "") !== encoded.replace(/=+$/u, "")) {
        throw new Error("non-canonical base64");
      }
      return { alg: cycloneAlgorithm, content: bytes.toString("hex") };
    } catch (cause) {
      throw new DependencyAuditError(`Invalid ${prefix} integrity value ${token}.`, { cause });
    }
  }
  return null;
}

function cycloneDxLicenses(license) {
  if (/[()]/u.test(license) || /\s(?:AND|OR|WITH)\s/iu.test(license)) {
    return [{ expression: license }];
  }
  if (/^[A-Za-z0-9][A-Za-z0-9.+-]*$/u.test(license)) {
    return [{ license: { id: license } }];
  }
  return [{ license: { name: license } }];
}

function compareComponents(left, right) {
  return left.name.localeCompare(right.name, "en") || left.version.localeCompare(right.version, "en") || left.ref.localeCompare(right.ref, "en");
}

export function collectRuntimeDependencies(lock) {
  validateLockfile(lock);
  const packages = lock.packages;
  const roots = applicationWorkspaceRoots(packages);
  if (Object.keys(packages[""].dependencies ?? {}).length > 0) roots.unshift("");
  const visited = new Set();
  const externalPaths = new Set();
  const resolvedEdges = new Map();

  const visit = (rawPackagePath, requiredBy = null) => {
    const packagePath = dereferencePackagePath(packages, rawPackagePath);
    if (visited.has(packagePath)) return;
    const entry = packages[packagePath];
    const name = packageName(packagePath, entry);
    const workspace = isHakimiWorkspaceSource(packagePath, entry);

    if (!workspace && name.startsWith("@hakimi/")) {
      throw new DependencyAuditError(`@hakimi dependency ${name} is not resolved to a workspace link.`);
    }
    if (!workspace && entry.dev === true) {
      throw new DependencyAuditError(`Runtime dependency ${name} is resolved to a dev-only lock entry${requiredBy ? ` from ${requiredBy}` : ""}.`);
    }

    visited.add(packagePath);
    if (!workspace) externalPaths.add(packagePath);
    const targets = [];
    for (const dependency of runtimeDependencyEdges(entry)) {
      const resolved = resolveDependencyPath(packages, packagePath, dependency.name);
      if (!resolved) {
        if (dependency.optional) continue;
        throw new DependencyAuditError(`Cannot resolve runtime ${dependency.kind} ${dependency.name} from ${packagePath || "root"}.`);
      }
      const resolvedEntry = packages[resolved];
      if (resolvedEntry.dev === true) {
        if (dependency.optional) continue;
        throw new DependencyAuditError(`Runtime dependency ${dependency.name} from ${packagePath || "root"} resolves to a dev-only lock entry.`);
      }
      targets.push(resolved);
      visit(resolved, packagePath || "root");
    }
    resolvedEdges.set(packagePath, [...new Set(targets)].sort());
  };

  for (const root of [...new Set(roots)].sort()) visit(root);

  const componentByRef = new Map();
  const refByPath = new Map();
  for (const packagePath of [...externalPaths].sort()) {
    const entry = packages[packagePath];
    const name = packageName(packagePath, entry);
    if (typeof entry.version !== "string" || !entry.version.trim()) {
      throw new DependencyAuditError(`Runtime dependency ${name} at ${packagePath} has no locked version.`);
    }
    const version = entry.version.trim();
    const license = requireLicense(name, version, entry);
    const ref = npmPurl(name, version);
    const facts = {
      name,
      version,
      license,
      integrity: typeof entry.integrity === "string" ? entry.integrity : null,
      resolved: typeof entry.resolved === "string" ? entry.resolved : null
    };
    const existing = componentByRef.get(ref);
    if (existing) {
      for (const field of ["name", "version", "license", "integrity", "resolved"]) {
        if (existing[field] !== facts[field]) {
          throw new DependencyAuditError(`Duplicate component ${ref} has inconsistent ${field} metadata.`);
        }
      }
      existing.lockPaths.push(packagePath);
    } else {
      componentByRef.set(ref, {
        ...facts,
        ref,
        lockPaths: [packagePath],
        review: licenseReview(license),
        dependencyRefs: new Set()
      });
    }
    refByPath.set(packagePath, ref);
  }

  const externalFrontier = (packagePath, seen = new Set()) => {
    if (seen.has(packagePath)) return new Set();
    const nextSeen = new Set(seen).add(packagePath);
    const directRef = refByPath.get(packagePath);
    if (directRef) return new Set([directRef]);
    const refs = new Set();
    for (const target of resolvedEdges.get(packagePath) ?? []) {
      for (const ref of externalFrontier(target, nextSeen)) refs.add(ref);
    }
    return refs;
  };

  for (const packagePath of externalPaths) {
    const component = componentByRef.get(refByPath.get(packagePath));
    for (const target of resolvedEdges.get(packagePath) ?? []) {
      for (const ref of externalFrontier(target)) {
        if (ref !== component.ref) component.dependencyRefs.add(ref);
      }
    }
  }

  const components = [...componentByRef.values()].sort(compareComponents).map((component) => ({
    ...component,
    lockPaths: [...component.lockPaths].sort(),
    dependencyRefs: [...component.dependencyRefs].sort()
  }));
  return { components, roots: [...new Set(roots)].sort() };
}

function rootApplication(lock) {
  const root = lock.packages[""];
  const name = typeof root.name === "string" && root.name.trim() ? root.name.trim() : lock.name;
  const version = typeof root.version === "string" && root.version.trim() ? root.version.trim() : lock.version;
  if (typeof name !== "string" || !name || typeof version !== "string" || !version) {
    throw new DependencyAuditError("package-lock root package must declare name and version.");
  }
  return { name, version, ref: npmPurl(name, version) };
}

function cycloneDxComponent(component) {
  const output = {
    type: "library",
    "bom-ref": component.ref,
    name: component.name,
    version: component.version,
    scope: "required",
    licenses: cycloneDxLicenses(component.license),
    purl: component.ref
  };
  const hash = integrityHash(component.integrity);
  if (hash) output.hashes = [hash];
  if (component.resolved) {
    output.externalReferences = [{ type: "distribution", url: component.resolved }];
  }
  output.properties = [
    { name: "hakimi:licenseReview", value: component.review.status },
    { name: "hakimi:packageLockPaths", value: component.lockPaths.join(",") }
  ];
  return output;
}

export function generateCycloneDx(lock, runtime = collectRuntimeDependencies(lock)) {
  const application = rootApplication(lock);
  const componentRefs = runtime.components.map((component) => component.ref).sort();
  return {
    "$schema": `http://cyclonedx.org/schema/bom-${CYCLONEDX_SPEC_VERSION}.schema.json`,
    bomFormat: "CycloneDX",
    specVersion: CYCLONEDX_SPEC_VERSION,
    version: 1,
    metadata: {
      component: {
        type: "application",
        "bom-ref": application.ref,
        name: application.name,
        version: application.version,
        purl: application.ref
      }
    },
    components: runtime.components.map(cycloneDxComponent),
    dependencies: [
      { ref: application.ref, dependsOn: componentRefs },
      ...runtime.components.map((component) => ({
        ref: component.ref,
        dependsOn: [...component.dependencyRefs].sort()
      }))
    ]
  };
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function generateThirdPartyNotices(lock, runtime = collectRuntimeDependencies(lock)) {
  const application = rootApplication(lock);
  const manual = runtime.components.filter((component) => component.review.status === "manual_review_required");
  const lines = [
    "# Third-Party Notices",
    "",
    `This deterministic inventory covers third-party runtime dependencies of \`${application.name}@${application.version}\` resolved from \`package-lock.json\` v3. It excludes local \`@hakimi/*\` workspaces and development-only packages.`,
    "",
    "A declared license identifier is evidence from the lockfile, not a legal opinion or a claim that every distribution obligation has been satisfied. Review the applicable license text and distribution context before release.",
    "",
    "## Manual review queue",
    ""
  ];

  if (manual.length === 0) {
    lines.push("No runtime dependency in this lockfile is currently outside the narrow standard-notice allowlist.", "");
  } else {
    lines.push("| Package | Version | Declared license | Reason |", "| --- | --- | --- | --- |");
    for (const component of manual) {
      lines.push(`| ${markdownCell(component.name)} | ${markdownCell(component.version)} | ${markdownCell(component.license)} | **MANUAL REVIEW REQUIRED.** ${markdownCell(component.review.reason)} |`);
    }
    lines.push("");
  }

  lines.push("## Runtime dependency inventory", "");
  for (const component of runtime.components) {
    const reviewText = component.review.status === "manual_review_required"
      ? `**MANUAL REVIEW REQUIRED.** ${component.review.reason}`
      : component.review.reason;
    lines.push(
      `### \`${component.name}\` ${component.version}`,
      "",
      `- Declared license: \`${component.license}\``,
      `- Review classification: ${reviewText}`,
      `- Package URL: \`${component.ref}\``,
      `- Lock path${component.lockPaths.length === 1 ? "" : "s"}: ${component.lockPaths.map((value) => `\`${value}\``).join(", ")}`
    );
    if (component.resolved) lines.push(`- Locked artifact: ${component.resolved}`);
    if (component.integrity) lines.push(`- Locked integrity: \`${component.integrity}\``);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function generateDependencyAuditArtifacts(lock) {
  const runtime = collectRuntimeDependencies(lock);
  const sbom = generateCycloneDx(lock, runtime);
  return {
    componentCount: runtime.components.length,
    manualReviewCount: runtime.components.filter((component) => component.review.status === "manual_review_required").length,
    sbom: `${JSON.stringify(sbom, null, 2)}\n`,
    notices: generateThirdPartyNotices(lock, runtime)
  };
}

async function readJson(filePath) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (cause) {
    throw new DependencyAuditError(`Cannot read ${filePath}.`, { cause });
  }
  try {
    return JSON.parse(source);
  } catch (cause) {
    throw new DependencyAuditError(`${filePath} is not valid JSON.`, { cause });
  }
}

async function writeIfChanged(filePath, content) {
  let current = null;
  try {
    current = await readFile(filePath, "utf8");
  } catch (cause) {
    if (cause?.code !== "ENOENT") throw cause;
  }
  if (current === content) return false;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  return true;
}

async function checkExactFiles(rootDirectory, artifacts) {
  const expectations = [
    [SBOM_FILE, artifacts.sbom],
    [NOTICES_FILE, artifacts.notices]
  ];
  const stale = [];
  for (const [relativePath, expected] of expectations) {
    try {
      const actual = await readFile(path.join(rootDirectory, relativePath), "utf8");
      if (actual !== expected) stale.push(relativePath);
    } catch (cause) {
      if (cause?.code === "ENOENT") stale.push(relativePath);
      else throw cause;
    }
  }
  if (stale.length > 0) {
    throw new DependencyAuditError(`Dependency audit artifacts are missing or stale: ${stale.join(", ")}. Run --write and review the result.`);
  }
}

export async function runDependencyAudit(mode, options = {}) {
  const rootDirectory = options.rootDirectory ?? REPOSITORY_ROOT;
  const lock = await readJson(path.join(rootDirectory, PACKAGE_LOCK_FILE));
  const artifacts = generateDependencyAuditArtifacts(lock);

  if (mode === "write") {
    const results = await Promise.all([
      writeIfChanged(path.join(rootDirectory, SBOM_FILE), artifacts.sbom),
      writeIfChanged(path.join(rootDirectory, NOTICES_FILE), artifacts.notices)
    ]);
    return { ...artifacts, changedFiles: results.filter(Boolean).length };
  }
  if (mode === "check") {
    await checkExactFiles(rootDirectory, artifacts);
    return { ...artifacts, changedFiles: 0 };
  }
  throw new DependencyAuditError(`Unsupported dependency audit mode ${String(mode)}.`);
}

function fixtureLock() {
  return {
    name: "fixture-app",
    version: "1.0.0",
    lockfileVersion: 3,
    packages: {
      "": {
        name: "fixture-app",
        version: "1.0.0",
        workspaces: ["apps/*", "packages/*"],
        devDependencies: { "dev-only": "1.0.0" }
      },
      "apps/web": {
        name: "@hakimi/web",
        version: "1.0.0",
        dependencies: {
          "@hakimi/core": "*",
          "blue-lib": "1.0.0",
          "cc-assets": "1.0.0",
          "runtime-a": "1.0.0"
        },
        devDependencies: { "dev-only": "1.0.0" }
      },
      "node_modules/@hakimi/core": { resolved: "packages/core", link: true },
      "packages/core": {
        name: "@hakimi/core",
        version: "1.0.0",
        dependencies: { "mpl-lib": "2.0.0" }
      },
      "node_modules/runtime-a": {
        version: "1.0.0",
        license: "MIT",
        resolved: "https://registry.example/runtime-a-1.0.0.tgz",
        integrity: `sha512-${Buffer.from("runtime-a-fixture").toString("base64")}`,
        dependencies: { transitive: "1.0.0" }
      },
      "node_modules/transitive": { version: "1.0.0", license: "Apache-2.0" },
      "node_modules/mpl-lib": { version: "2.0.0", license: "MPL-2.0" },
      "node_modules/cc-assets": { version: "1.0.0", license: "CC-BY-4.0" },
      "node_modules/blue-lib": { version: "1.0.0", license: "BlueOak-1.0.0" },
      "node_modules/dev-only": { version: "1.0.0", license: "MIT", dev: true }
    }
  };
}

export async function runSelfTest() {
  const fixture = fixtureLock();
  const first = generateDependencyAuditArtifacts(fixture);
  const second = generateDependencyAuditArtifacts(structuredClone(fixture));
  assert.deepEqual(first, second, "generation must be deterministic");
  const parsed = JSON.parse(first.sbom);
  assert.deepEqual(parsed.components.map((component) => component.name), [
    "blue-lib",
    "cc-assets",
    "mpl-lib",
    "runtime-a",
    "transitive"
  ]);
  assert.equal(parsed.components.some((component) => component.name.startsWith("@hakimi/")), false);
  assert.equal(parsed.components.some((component) => component.name === "dev-only"), false);
  assert.equal("serialNumber" in parsed, false);
  assert.equal("timestamp" in parsed.metadata, false);
  assert.match(first.notices, /blue-lib[^\n]*BlueOak-1\.0\.0[^\n]*MANUAL REVIEW REQUIRED/iu);
  assert.match(first.notices, /cc-assets[^\n]*CC-BY-4\.0[^\n]*MANUAL REVIEW REQUIRED/iu);
  assert.match(first.notices, /mpl-lib[^\n]*MPL-2\.0[^\n]*MANUAL REVIEW REQUIRED/iu);
  assert.equal(first.manualReviewCount, 3);

  const missingLicense = structuredClone(fixture);
  delete missingLicense.packages["node_modules/runtime-a"].license;
  assert.throws(() => generateDependencyAuditArtifacts(missingLicense), /missing a declared license/iu);
  const unlicensed = structuredClone(fixture);
  unlicensed.packages["node_modules/runtime-a"].license = "UNLICENSED";
  assert.throws(() => generateDependencyAuditArtifacts(unlicensed), /disallowed license value UNLICENSED/iu);

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-dependency-audit-"));
  try {
    await writeFile(path.join(temporaryRoot, PACKAGE_LOCK_FILE), `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
    const written = await runDependencyAudit("write", { rootDirectory: temporaryRoot });
    assert.equal(written.changedFiles, 2);
    await runDependencyAudit("check", { rootDirectory: temporaryRoot });
    await writeFile(path.join(temporaryRoot, NOTICES_FILE), "stale\n", "utf8");
    await assert.rejects(
      runDependencyAudit("check", { rootDirectory: temporaryRoot }),
      /missing or stale: THIRD_PARTY_NOTICES\.md/iu
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length !== 1 || !["--write", "--check", "--self-test"].includes(argumentsList[0])) {
    throw new DependencyAuditError("Usage: node scripts/generate-dependency-audit.mjs --write|--check|--self-test");
  }
  if (argumentsList[0] === "--self-test") {
    await runSelfTest();
    console.log("Dependency audit self-test passed.");
    return;
  }
  const mode = argumentsList[0] === "--write" ? "write" : "check";
  const result = await runDependencyAudit(mode);
  console.log(
    mode === "write"
      ? `Dependency audit generated ${result.componentCount} runtime components; ${result.manualReviewCount} require manual review; ${result.changedFiles} artifact(s) changed.`
      : `Dependency audit is current: ${result.componentCount} runtime components; ${result.manualReviewCount} require manual review.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((cause) => {
    console.error(`[dependency-audit] ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  });
}
