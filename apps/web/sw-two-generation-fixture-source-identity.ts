import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM = "sha256" as const;
export const SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN =
  "hakimi-sw-two-generation-critical-source-set-v1" as const;

type ExpectedCriticalSource = Readonly<{
  role: string;
  path: string;
  size: number;
  rawSha256: string;
  normalizedSha256: string;
}>;

// This is a deliberately bounded critical set, not a claim that every
// transitive build dependency has been frozen. This module's own bytes are
// independently frozen by release governance to avoid a self-hash cycle.
// Formal artifact inventories and real-host evidence remain separate gates.
export const SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES:
readonly ExpectedCriticalSource[] = Object.freeze([
  { role: "harness_helper", path: "apps/web/e2e/full-backup-helpers.ts", size: 16322, rawSha256: "959f7c3c18798ab8bdd1a724f19222955cfdae25cce6d8c31d2b7886732dcc58", normalizedSha256: "959f7c3c18798ab8bdd1a724f19222955cfdae25cce6d8c31d2b7886732dcc58" },
  { role: "harness_browser_context", path: "apps/web/e2e/release-browser-persistent-context.ts", size: 1808, rawSha256: "df4074e6f8cdc795192d7c6db4d7ab0e0451eb422e503e00bfa3a517efc8c491", normalizedSha256: "df4074e6f8cdc795192d7c6db4d7ab0e0451eb422e503e00bfa3a517efc8c491" },
  { role: "harness_spec", path: "apps/web/e2e/service-worker-two-generation.spec.ts", size: 32251, rawSha256: "798ca1951d6479e4441357abfc2ff9cd074c4a8c1c4da79adce38dcfc2f2baa9", normalizedSha256: "798ca1951d6479e4441357abfc2ff9cd074c4a8c1c4da79adce38dcfc2f2baa9" },
  { role: "harness_storage_reader", path: "apps/web/e2e/storage-v13-native-readonly.ts", size: 23244, rawSha256: "9852404a24f107ee73e0edf36ed658ec07f008e27dd02d9df981f352e777f861", normalizedSha256: "9852404a24f107ee73e0edf36ed658ec07f008e27dd02d9df981f352e777f861" },
  { role: "harness_browser_matrix", path: "apps/web/playwright.release-browser-matrix.ts", size: 2683, rawSha256: "dd17289df1c7007318d36a158e52abab49534828c2cc1d4598ae424526afa5a3", normalizedSha256: "dd17289df1c7007318d36a158e52abab49534828c2cc1d4598ae424526afa5a3" },
  { role: "harness_reporter", path: "apps/web/playwright.sw-two-generation-fixture-reporter.ts", size: 11769, rawSha256: "c6c587f2c81ebcf9883db8288998df2bfa060adfb35c18b5b56777e2cc59a1d0", normalizedSha256: "c6c587f2c81ebcf9883db8288998df2bfa060adfb35c18b5b56777e2cc59a1d0" },
  { role: "harness_result_contract", path: "apps/web/playwright.sw-two-generation-fixture-result.ts", size: 15268, rawSha256: "d64bacd90a1d8f937c8b2bce10173d5c93ab460e123a4f8abef6b5cd8d5bcf1e", normalizedSha256: "d64bacd90a1d8f937c8b2bce10173d5c93ab460e123a4f8abef6b5cd8d5bcf1e" },
  { role: "harness_playwright_config", path: "apps/web/playwright.sw-upgrade.config.ts", size: 1399, rawSha256: "7a4a540a5d9ea0174b4fb6ecab0e2d8abe391ccfc7daf43b950db17e3a98a803", normalizedSha256: "7a4a540a5d9ea0174b4fb6ecab0e2d8abe391ccfc7daf43b950db17e3a98a803" },
  { role: "product_service_worker", path: "apps/web/public/sw.js", size: 93807, rawSha256: "623029c23b820a8c213ccea5be2a337b2ea7f6668dd561212a97a019c16ab82e", normalizedSha256: "623029c23b820a8c213ccea5be2a337b2ea7f6668dd561212a97a019c16ab82e" },
  { role: "product_release_protocol", path: "apps/web/release-protocol.ts", size: 17710, rawSha256: "6dc9a7b59b9bc31bb04b4c084d9cdc893e7593f0d94261244efa3c3f8df061f1", normalizedSha256: "6dc9a7b59b9bc31bb04b4c084d9cdc893e7593f0d94261244efa3c3f8df061f1" },
  { role: "product_write_fence", path: "apps/web/src/lib/release-controller-takeover-write-fence.ts", size: 1356, rawSha256: "0df30d157c04a9658eb992d2ca51bd4271e06176da193399ca2b7fa98dad0ab1", normalizedSha256: "0df30d157c04a9658eb992d2ca51bd4271e06176da193399ca2b7fa98dad0ab1" },
  { role: "product_database_coordinator", path: "apps/web/src/lib/release-database-coordinator.ts", size: 54248, rawSha256: "c57bb717e38b8fed863c6098758c3dd80f385a1525f02c455ecae7e08f9fac95", normalizedSha256: "c57bb717e38b8fed863c6098758c3dd80f385a1525f02c455ecae7e08f9fac95" },
  { role: "product_takeover_retry_scheduler", path: "apps/web/src/lib/service-worker-takeover-retry.ts", size: 16694, rawSha256: "846f6de1a4b82fa360bba444749f2e1c80d8354a88a0c4f319765e6030f9a5c2", normalizedSha256: "846f6de1a4b82fa360bba444749f2e1c80d8354a88a0c4f319765e6030f9a5c2" },
  { role: "product_bootstrap_wiring", path: "apps/web/src/main.tsx", size: 50303, rawSha256: "2a65a4171ec608f24917c0f7d345a9cdc2a823e928629b43f61a6444a0223dcd", normalizedSha256: "2a65a4171ec608f24917c0f7d345a9cdc2a823e928629b43f61a6444a0223dcd" },
  { role: "product_mutation_ui", path: "apps/web/src/pages/case-library-page.tsx", size: 78051, rawSha256: "26e908fe7ff930f6640fee018784976276387ff88cbbe691eb71747778bfec83", normalizedSha256: "26e908fe7ff930f6640fee018784976276387ff88cbbe691eb71747778bfec83" },
  { role: "harness_artifact_identity", path: "apps/web/sw-two-generation-artifact-identity.ts", size: 26306, rawSha256: "9062d55c299550c8c3293184eac32c077cd13a9866466a84ba0a5092f19da38c", normalizedSha256: "9062d55c299550c8c3293184eac32c077cd13a9866466a84ba0a5092f19da38c" },
  { role: "product_build_config", path: "apps/web/vite.config.ts", size: 16930, rawSha256: "96ed96d3fedc7c5efd4810ee844f6b6c0c749cc179820cdc1f4a55a04dbfc9e8", normalizedSha256: "96ed96d3fedc7c5efd4810ee844f6b6c0c749cc179820cdc1f4a55a04dbfc9e8" },
  { role: "harness_build_config", path: "apps/web/vite.sw-upgrade.config.ts", size: 2417, rawSha256: "a032c5703221f42973a745807b7e7f370b13f9ae2c694df2b4ece27ee3f63b81", normalizedSha256: "a032c5703221f42973a745807b7e7f370b13f9ae2c694df2b4ece27ee3f63b81" },
  { role: "product_storage_runtime", path: "packages/storage/src/index.ts", size: 378803, rawSha256: "4ff7d34c204297f4b4a5cbcdb5e150be79b32853e70b07c428a58944e551ee65", normalizedSha256: "4ff7d34c204297f4b4a5cbcdb5e150be79b32853e70b07c428a58944e551ee65" },
  { role: "harness_runner", path: "scripts/run-sw-two-generation-fixture.mjs", size: 6357, rawSha256: "5a9735d8b042f279d87d2664541dc24160079e741c0879f10f1dee07a52c7451", normalizedSha256: "5a9735d8b042f279d87d2664541dc24160079e741c0879f10f1dee07a52c7451" },
  { role: "harness_contract_test", path: "scripts/sw-two-generation-fixture-contract.test.mjs", size: 31080, rawSha256: "1d184e3183f73cd594267f931b485c48d576034bd88ec179c444c6c963929046", normalizedSha256: "1d184e3183f73cd594267f931b485c48d576034bd88ec179c444c6c963929046" }
].map((entry) => Object.freeze(entry)));

export const SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256 =
  "e5e7ced52540e761940b632291d25edbe989306a16add8e2c3a61fb3d8876a00" as const;

export type SwTwoGenerationFixtureCriticalSourceIdentity = Readonly<{
  algorithm: typeof SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM;
  domain: typeof SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN;
  files: readonly Readonly<{
    role: string;
    path: string;
    size: number;
    rawSha256: string;
    normalizedSha256: string;
  }>[];
  canonicalSha256: string;
}>;

const workspaceRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedSourceSha256(source: string): string {
  return createHash("sha256")
    .update(source.replace(/\r\n?/gu, "\n"))
    .digest("hex");
}

function canonicalSourceSetSha256(files: readonly Readonly<{
  role: string;
  path: string;
  size: number;
  rawSha256: string;
  normalizedSha256: string;
}>[]) {
  return sha256(`${SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN}\0${JSON.stringify(files)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== ""
    && !relative.startsWith(`..${path.sep}`)
    && relative !== ".."
    && !path.isAbsolute(relative);
}

function sameNativePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US")
    : left === right;
}

export function loadSwTwoGenerationFixtureCriticalSourceIdentity(
  root = workspaceRoot
): SwTwoGenerationFixtureCriticalSourceIdentity {
  const resolvedRoot = path.resolve(root);
  const realRoot = realpathSync.native(resolvedRoot);
  const seenPaths = new Set<string>();
  const expectedPaths = SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES.map(
    (entry) => entry.path
  );
  if (JSON.stringify(expectedPaths) !== JSON.stringify([...expectedPaths].sort())) {
    throw new Error("SW fixture critical source policy is not in canonical path order.");
  }
  const files = SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES.map((expected) => {
    if (expected.path.includes("\\") || path.posix.normalize(expected.path) !== expected.path) {
      throw new Error(`SW fixture critical source path is not canonical POSIX: ${expected.path}.`);
    }
    const pathKey = expected.path.toLocaleLowerCase("en-US");
    if (seenPaths.has(pathKey)) {
      throw new Error(`SW fixture critical source path is duplicated or case-colliding: ${expected.path}.`);
    }
    seenPaths.add(pathKey);
    const absolutePath = path.resolve(resolvedRoot, ...expected.path.split("/"));
    if (!isContainedPath(resolvedRoot, absolutePath)) {
      throw new Error(`SW fixture critical source escaped the workspace: ${expected.path}.`);
    }
    const sourceStat = lstatSync(absolutePath);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
      throw new Error(`SW fixture critical source is not a regular non-symlink file: ${expected.path}.`);
    }
    const realPath = realpathSync.native(absolutePath);
    const expectedRealPath = path.resolve(realRoot, ...expected.path.split("/"));
    if (!isContainedPath(realRoot, realPath) || !sameNativePath(realPath, expectedRealPath)) {
      throw new Error(`SW fixture critical source traversed a link or reparse boundary: ${expected.path}.`);
    }
    const bytes = readFileSync(realPath);
    return Object.freeze({
      role: expected.role,
      path: expected.path,
      size: bytes.byteLength,
      rawSha256: sha256(bytes),
      normalizedSha256: normalizedSourceSha256(bytes.toString("utf8"))
    });
  });
  return Object.freeze({
    algorithm: SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM,
    domain: SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN,
    files: Object.freeze(files),
    canonicalSha256: canonicalSourceSetSha256(files)
  });
}

export function isExactSwTwoGenerationFixtureCriticalSourceIdentity(
  value: unknown
): value is SwTwoGenerationFixtureCriticalSourceIdentity {
  if (!isRecord(value) || !hasExactKeys(value, ["algorithm", "domain", "files", "canonicalSha256"])) {
    return false;
  }
  if (
    value.algorithm !== SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM
    || value.domain !== SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN
    || !Array.isArray(value.files)
    || value.files.length !== SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES.length
    || value.canonicalSha256 !== SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256
    || !SHA256_PATTERN.test(value.canonicalSha256)
  ) return false;
  for (let index = 0; index < value.files.length; index += 1) {
    const actual = value.files[index];
    const expected = SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES[index];
    if (
      !isRecord(actual)
      || !hasExactKeys(actual, ["role", "path", "size", "rawSha256", "normalizedSha256"])
      || actual.role !== expected.role
      || actual.path !== expected.path
      || actual.size !== expected.size
      || actual.rawSha256 !== expected.rawSha256
      || actual.normalizedSha256 !== expected.normalizedSha256
      || !Number.isSafeInteger(actual.size)
      || actual.size <= 0
      || !SHA256_PATTERN.test(actual.rawSha256)
      || !SHA256_PATTERN.test(actual.normalizedSha256)
    ) return false;
  }
  return canonicalSourceSetSha256(
    value.files as readonly Readonly<{
      role: string;
      path: string;
      size: number;
      rawSha256: string;
      normalizedSha256: string;
    }>[]
  ) === value.canonicalSha256;
}

export function assertSwTwoGenerationFixtureCriticalSourceIdentity(
  value: unknown
): asserts value is SwTwoGenerationFixtureCriticalSourceIdentity {
  if (!isExactSwTwoGenerationFixtureCriticalSourceIdentity(value)) {
    throw new Error("SW two-generation fixture critical source identity drifted.");
  }
}
