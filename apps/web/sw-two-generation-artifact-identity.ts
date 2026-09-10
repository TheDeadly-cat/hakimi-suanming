import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";

export const SW_TWO_GENERATION_ARTIFACT_IDENTITY_SCHEMA_VERSION = 1 as const;
export const SW_TWO_GENERATION_ARTIFACT_INVENTORY_DOMAIN =
  "hakimi-sw-two-generation-artifact-inventory-v1" as const;
export const SW_TWO_GENERATION_ARTIFACT_SET_DOMAIN =
  "hakimi-sw-two-generation-artifact-set-v1" as const;
export const SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY = Object.freeze({
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
} as const);
export const SW_TWO_GENERATION_ARTIFACT_GENERATIONS = Object.freeze([
  Object.freeze({ generationName: "stable-a", fault: "none" }),
  Object.freeze({ generationName: "healthy-b", fault: "none" }),
  Object.freeze({ generationName: "broken-b", fault: "research-route" })
] as const);

export type SwTwoGenerationArtifactGenerationName =
  (typeof SW_TWO_GENERATION_ARTIFACT_GENERATIONS)[number]["generationName"];
export type SwTwoGenerationArtifactFault =
  (typeof SW_TWO_GENERATION_ARTIFACT_GENERATIONS)[number]["fault"];

export type SwTwoGenerationArtifactFileIdentity = Readonly<{
  path: string;
  size: number;
  sha256: string;
}>;

export type SwTwoGenerationGenerationArtifactIdentity = Readonly<{
  generationName: SwTwoGenerationArtifactGenerationName;
  fault: SwTwoGenerationArtifactFault;
  buildVersion: string;
  releaseIdentity: typeof SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY;
  releaseDescriptorSha256: string;
  releaseStorageManifestSha256: string;
  fileCount: number;
  indexHtmlSha256: string;
  serviceWorkerSha256: string;
  artifactInventorySha256: string;
  files: readonly SwTwoGenerationArtifactFileIdentity[];
}>;

export type SwTwoGenerationArtifactSetIdentity = Readonly<{
  schemaVersion: typeof SW_TWO_GENERATION_ARTIFACT_IDENTITY_SCHEMA_VERSION;
  identityType: "sw_two_generation_local_fixture_artifact_set";
  algorithm: "sha256";
  domain: typeof SW_TWO_GENERATION_ARTIFACT_SET_DOMAIN;
  canonicalization: "ordered_generation_identity_with_sorted_posix_file_tuples_v1";
  evidenceId: "unbound-local-build";
  releaseDescriptorSha256: string;
  releaseStorageManifestSha256: string;
  generations: readonly SwTwoGenerationGenerationArtifactIdentity[];
  canonicalSha256: string;
}>;

export type SwTwoGenerationArtifactSnapshot = Readonly<{
  name: SwTwoGenerationArtifactGenerationName;
  version: string;
  identity: SwTwoGenerationGenerationArtifactIdentity;
  entryPath: string;
  markerPath: string;
  researchRoutePath: string;
}>;

export type SwTwoGenerationArtifactSetSnapshot = Readonly<{
  identity: SwTwoGenerationArtifactSetIdentity;
  generations: readonly SwTwoGenerationArtifactSnapshot[];
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;
const ARTIFACT_PATH_PATTERN = /^[A-Za-z0-9._/-]+$/u;
const GENERATION_KEYS = Object.freeze([
  "generationName",
  "fault",
  "buildVersion",
  "releaseIdentity",
  "releaseDescriptorSha256",
  "releaseStorageManifestSha256",
  "fileCount",
  "indexHtmlSha256",
  "serviceWorkerSha256",
  "artifactInventorySha256",
  "files"
]);
const ARTIFACT_SET_KEYS = Object.freeze([
  "schemaVersion",
  "identityType",
  "algorithm",
  "domain",
  "canonicalization",
  "evidenceId",
  "releaseDescriptorSha256",
  "releaseStorageManifestSha256",
  "generations",
  "canonicalSha256"
]);
const ARTIFACT_SNAPSHOT_KEYS = Object.freeze([
  "name",
  "version",
  "identity",
  "entryPath",
  "markerPath",
  "researchRoutePath"
]);
type ArtifactSnapshotState = Readonly<{
  identity: SwTwoGenerationGenerationArtifactIdentity;
  bytesByPath: ReadonlyMap<string, Buffer>;
}>;
const artifactSnapshotStates = new WeakMap<object, ArtifactSnapshotState>();
const artifactSetSnapshotBrands = new WeakSet<object>();

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameNativePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US")
    : left === right;
}

function isContainedPath(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

export function isCanonicalSwTwoGenerationArtifactPath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && ARTIFACT_PATH_PATTERN.test(value)
    && !value.includes("%")
    && !value.includes("\\")
    && !value.includes("\0")
    && !path.posix.isAbsolute(value)
    && path.posix.normalize(value) === value
    && value !== "."
    && value !== ".."
    && !value.startsWith("../");
}

function artifactInventorySha256(files: readonly SwTwoGenerationArtifactFileIdentity[]): string {
  return sha256(`${SW_TWO_GENERATION_ARTIFACT_INVENTORY_DOMAIN}\0${JSON.stringify(
    files.map((file) => [file.path, file.size, file.sha256])
  )}`);
}

function artifactSetCanonicalSha256(
  generations: readonly SwTwoGenerationGenerationArtifactIdentity[]
): string {
  return sha256(`${SW_TWO_GENERATION_ARTIFACT_SET_DOMAIN}\0${JSON.stringify(generations)}`);
}

function expectedGeneration(
  generationName: unknown
): (typeof SW_TWO_GENERATION_ARTIFACT_GENERATIONS)[number] | null {
  return SW_TWO_GENERATION_ARTIFACT_GENERATIONS.find(
    (entry) => entry.generationName === generationName
  ) ?? null;
}

function fileIdentity(
  files: readonly SwTwoGenerationArtifactFileIdentity[],
  artifactPath: string
): SwTwoGenerationArtifactFileIdentity | null {
  return files.find((entry) => entry.path === artifactPath) ?? null;
}

export function isExactSwTwoGenerationGenerationArtifactIdentity(
  value: unknown
): value is SwTwoGenerationGenerationArtifactIdentity {
  if (!isRecord(value) || !hasExactKeys(value, GENERATION_KEYS)) return false;
  const expected = expectedGeneration(value.generationName);
  if (
    expected === null
    || value.fault !== expected.fault
    || typeof value.buildVersion !== "string"
    || !BUILD_VERSION_PATTERN.test(value.buildVersion)
    || !sameJson(value.releaseIdentity, SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY)
    || typeof value.releaseDescriptorSha256 !== "string"
    || !SHA256_PATTERN.test(value.releaseDescriptorSha256)
    || typeof value.releaseStorageManifestSha256 !== "string"
    || !SHA256_PATTERN.test(value.releaseStorageManifestSha256)
    || typeof value.fileCount !== "number"
    || !Number.isSafeInteger(value.fileCount)
    || value.fileCount <= 0
    || !Array.isArray(value.files)
    || value.files.length !== value.fileCount
    || typeof value.indexHtmlSha256 !== "string"
    || !SHA256_PATTERN.test(value.indexHtmlSha256)
    || typeof value.serviceWorkerSha256 !== "string"
    || !SHA256_PATTERN.test(value.serviceWorkerSha256)
    || typeof value.artifactInventorySha256 !== "string"
    || !SHA256_PATTERN.test(value.artifactInventorySha256)
  ) return false;

  const paths: string[] = [];
  const lowerPaths = new Set<string>();
  for (const file of value.files) {
    if (
      !isRecord(file)
      || !hasExactKeys(file, ["path", "size", "sha256"])
      || !isCanonicalSwTwoGenerationArtifactPath(file.path)
      || typeof file.size !== "number"
      || !Number.isSafeInteger(file.size)
      || file.size < 0
      || typeof file.sha256 !== "string"
      || !SHA256_PATTERN.test(file.sha256)
    ) return false;
    const lowerPath = file.path.toLocaleLowerCase("en-US");
    if (lowerPaths.has(lowerPath)) return false;
    lowerPaths.add(lowerPath);
    paths.push(file.path);
  }
  if (!sameJson(paths, [...paths].sort())) return false;

  const index = fileIdentity(value.files as readonly SwTwoGenerationArtifactFileIdentity[], "index.html");
  const worker = fileIdentity(value.files as readonly SwTwoGenerationArtifactFileIdentity[], "sw.js");
  const marker = fileIdentity(
    value.files as readonly SwTwoGenerationArtifactFileIdentity[],
    `e2e-sw-generation-${String(value.generationName)}.txt`
  );
  const markerFiles = (value.files as readonly SwTwoGenerationArtifactFileIdentity[]).filter(
    (file) => /^e2e-sw-generation-(?:stable-a|healthy-b|broken-b)\.txt$/u.test(file.path)
  );
  const researchRouteFiles = (value.files as readonly SwTwoGenerationArtifactFileIdentity[]).filter(
    (file) => /^assets\/research-query-page-.*\.js$/u.test(file.path)
  );
  return index?.sha256 === value.indexHtmlSha256
    && worker?.sha256 === value.serviceWorkerSha256
    && marker !== null
    && markerFiles.length === 1
    && markerFiles[0]?.path === marker.path
    && researchRouteFiles.length === 1
    && artifactInventorySha256(
      value.files as readonly SwTwoGenerationArtifactFileIdentity[]
    ) === value.artifactInventorySha256;
}

export function createSwTwoGenerationGenerationArtifactIdentity(input: Readonly<{
  generationName: SwTwoGenerationArtifactGenerationName;
  fault: SwTwoGenerationArtifactFault;
  buildVersion: string;
  releaseDescriptorSha256: string;
  releaseStorageManifestSha256: string;
  files: readonly SwTwoGenerationArtifactFileIdentity[];
}>): SwTwoGenerationGenerationArtifactIdentity {
  const files = Object.freeze(input.files.map((file) => Object.freeze({ ...file })));
  const identity = Object.freeze({
    generationName: input.generationName,
    fault: input.fault,
    buildVersion: input.buildVersion,
    releaseIdentity: SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY,
    releaseDescriptorSha256: input.releaseDescriptorSha256,
    releaseStorageManifestSha256: input.releaseStorageManifestSha256,
    fileCount: files.length,
    indexHtmlSha256: fileIdentity(files, "index.html")?.sha256 ?? "",
    serviceWorkerSha256: fileIdentity(files, "sw.js")?.sha256 ?? "",
    artifactInventorySha256: artifactInventorySha256(files),
    files
  });
  if (!isExactSwTwoGenerationGenerationArtifactIdentity(identity)) {
    throw new Error(`SW fixture generation artifact identity is invalid: ${input.generationName}.`);
  }
  return identity;
}

export function isExactSwTwoGenerationArtifactSetIdentity(
  value: unknown
): value is SwTwoGenerationArtifactSetIdentity {
  if (!isRecord(value) || !hasExactKeys(value, ARTIFACT_SET_KEYS)) return false;
  if (
    value.schemaVersion !== SW_TWO_GENERATION_ARTIFACT_IDENTITY_SCHEMA_VERSION
    || value.identityType !== "sw_two_generation_local_fixture_artifact_set"
    || value.algorithm !== "sha256"
    || value.domain !== SW_TWO_GENERATION_ARTIFACT_SET_DOMAIN
    || value.canonicalization !== "ordered_generation_identity_with_sorted_posix_file_tuples_v1"
    || value.evidenceId !== "unbound-local-build"
    || typeof value.releaseDescriptorSha256 !== "string"
    || !SHA256_PATTERN.test(value.releaseDescriptorSha256)
    || typeof value.releaseStorageManifestSha256 !== "string"
    || !SHA256_PATTERN.test(value.releaseStorageManifestSha256)
    || !Array.isArray(value.generations)
    || value.generations.length !== SW_TWO_GENERATION_ARTIFACT_GENERATIONS.length
    || typeof value.canonicalSha256 !== "string"
    || !SHA256_PATTERN.test(value.canonicalSha256)
  ) return false;
  for (let index = 0; index < value.generations.length; index += 1) {
    const generation = value.generations[index];
    const expected = SW_TWO_GENERATION_ARTIFACT_GENERATIONS[index];
    if (
      !isExactSwTwoGenerationGenerationArtifactIdentity(generation)
      || generation.generationName !== expected.generationName
      || generation.fault !== expected.fault
    ) return false;
  }
  const generations = value.generations as readonly SwTwoGenerationGenerationArtifactIdentity[];
  const markerHashes = generations.map((entry) => fileIdentity(
    entry.files,
    `e2e-sw-generation-${entry.generationName}.txt`
  )?.sha256 ?? "");
  const researchHashes = generations.map((entry) => entry.files.find(
    (file) => /^assets\/research-query-page-.*\.js$/u.test(file.path)
  )?.sha256 ?? "");
  if (
    new Set(generations.map((entry) => entry.buildVersion)).size !== generations.length
    || new Set(generations.map((entry) => entry.artifactInventorySha256)).size !== generations.length
    || new Set(generations.map((entry) => entry.indexHtmlSha256)).size !== generations.length
    || new Set(generations.map((entry) => entry.serviceWorkerSha256)).size !== generations.length
    || new Set(markerHashes).size !== generations.length
    || new Set(generations.map((entry) => entry.releaseDescriptorSha256)).size !== 1
    || new Set(generations.map((entry) => entry.releaseStorageManifestSha256)).size !== 1
    || value.releaseDescriptorSha256 !== generations[0]?.releaseDescriptorSha256
    || value.releaseStorageManifestSha256 !== generations[0]?.releaseStorageManifestSha256
    || researchHashes[1] === researchHashes[2]
  ) return false;
  return artifactSetCanonicalSha256(generations) === value.canonicalSha256;
}

export function createSwTwoGenerationArtifactSetIdentity(
  generations: readonly SwTwoGenerationGenerationArtifactIdentity[]
): SwTwoGenerationArtifactSetIdentity {
  const frozenGenerations = Object.freeze([...generations]);
  const identity = Object.freeze({
    schemaVersion: SW_TWO_GENERATION_ARTIFACT_IDENTITY_SCHEMA_VERSION,
    identityType: "sw_two_generation_local_fixture_artifact_set" as const,
    algorithm: "sha256" as const,
    domain: SW_TWO_GENERATION_ARTIFACT_SET_DOMAIN,
    canonicalization: "ordered_generation_identity_with_sorted_posix_file_tuples_v1" as const,
    evidenceId: "unbound-local-build" as const,
    releaseDescriptorSha256: frozenGenerations[0]?.releaseDescriptorSha256 ?? "",
    releaseStorageManifestSha256: frozenGenerations[0]?.releaseStorageManifestSha256 ?? "",
    generations: frozenGenerations,
    canonicalSha256: artifactSetCanonicalSha256(frozenGenerations)
  });
  if (!isExactSwTwoGenerationArtifactSetIdentity(identity)) {
    throw new Error("SW fixture artifact set identity is invalid or generations are not distinct.");
  }
  return identity;
}

export function assertSwTwoGenerationArtifactSetIdentity(
  value: unknown
): asserts value is SwTwoGenerationArtifactSetIdentity {
  if (!isExactSwTwoGenerationArtifactSetIdentity(value)) {
    throw new Error("SW two-generation fixture artifact set identity is invalid.");
  }
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function readHtmlMeta(html: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=(["'])(.*?)\\1\\s*\\/?>`,
    "iu"
  ));
  if (!match?.[2]) throw new Error(`SW fixture artifact index is missing ${name} metadata.`);
  return decodeHtmlAttribute(match[2]);
}

async function collectArtifactBytes(root: string): Promise<ReadonlyMap<string, Buffer>> {
  const resolvedRoot = path.resolve(root);
  const rootStat = await lstat(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("SW fixture artifact root must be a regular non-symlink directory.");
  }
  const realRoot = await realpath(resolvedRoot);
  if (!sameNativePath(resolvedRoot, realRoot)) {
    throw new Error("SW fixture artifact root traversed a link or reparse boundary.");
  }
  const bytesByPath = new Map<string, Buffer>();
  const lowerPaths = new Set<string>();

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`SW fixture artifact traversed a symlink: ${entry.name}.`);
      }
      if (entry.isDirectory()) {
        const directoryStat = await lstat(absolutePath);
        const realDirectory = await realpath(absolutePath);
        const expectedRealDirectory = path.resolve(
          realRoot,
          path.relative(resolvedRoot, absolutePath)
        );
        if (
          !directoryStat.isDirectory()
          || directoryStat.isSymbolicLink()
          || !isContainedPath(realRoot, realDirectory)
          || !sameNativePath(realDirectory, expectedRealDirectory)
        ) {
          throw new Error(`SW fixture artifact traversed a directory reparse boundary: ${entry.name}.`);
        }
        await walk(realDirectory);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`SW fixture artifact contains a non-file entry: ${entry.name}.`);
      }
      const sourceStat = await lstat(absolutePath);
      const realPath = await realpath(absolutePath);
      const expectedRealPath = path.resolve(realRoot, path.relative(resolvedRoot, absolutePath));
      if (
        !sourceStat.isFile()
        || sourceStat.isSymbolicLink()
        || !isContainedPath(realRoot, realPath)
        || !sameNativePath(realPath, expectedRealPath)
      ) {
        throw new Error(`SW fixture artifact traversed a link or reparse boundary: ${entry.name}.`);
      }
      const artifactPath = path.relative(resolvedRoot, absolutePath).split(path.sep).join("/");
      if (!isCanonicalSwTwoGenerationArtifactPath(artifactPath)) {
        throw new Error(`SW fixture artifact path is not canonical: ${artifactPath}.`);
      }
      const lowerPath = artifactPath.toLocaleLowerCase("en-US");
      if (lowerPaths.has(lowerPath)) {
        throw new Error(`SW fixture artifact path is duplicated or case-colliding: ${artifactPath}.`);
      }
      lowerPaths.add(lowerPath);
      bytesByPath.set(artifactPath, await readFile(realPath));
    }
  }

  await walk(resolvedRoot);
  return bytesByPath;
}

export async function snapshotSwTwoGenerationArtifactDirectory(input: Readonly<{
  directory: string;
  generationName: SwTwoGenerationArtifactGenerationName;
  fault: SwTwoGenerationArtifactFault;
}>): Promise<SwTwoGenerationArtifactSnapshot> {
  const bytesByPath = await collectArtifactBytes(input.directory);
  const sortedPaths = [...bytesByPath.keys()].sort();
  const files = Object.freeze(sortedPaths.map((artifactPath) => {
    const bytes = bytesByPath.get(artifactPath);
    if (!bytes) throw new Error(`SW fixture artifact disappeared from snapshot: ${artifactPath}.`);
    return Object.freeze({ path: artifactPath, size: bytes.byteLength, sha256: sha256(bytes) });
  }));
  const indexBytes = bytesByPath.get("index.html");
  const workerBytes = bytesByPath.get("sw.js");
  if (!indexBytes || !workerBytes) {
    throw new Error(`SW fixture build ${input.generationName} is missing index.html or sw.js.`);
  }
  const index = indexBytes.toString("utf8");
  const worker = workerBytes.toString("utf8");
  const buildVersion = readHtmlMeta(index, "hakimi-build-version");
  const serializedDescriptor = readHtmlMeta(index, "hakimi-release-database");
  const serializedManifest = readHtmlMeta(index, "hakimi-release-storage-manifest");
  const injectedManifestDigest = readHtmlMeta(index, "hakimi-release-storage-manifest-digest");
  const releaseEvidenceId = readHtmlMeta(index, "hakimi-release-evidence-id");
  const descriptor = JSON.parse(serializedDescriptor) as Record<string, unknown>;
  const manifest = JSON.parse(serializedManifest) as { database?: unknown };
  if (!BUILD_VERSION_PATTERN.test(buildVersion)) {
    throw new Error(`SW fixture build version is not canonical: ${input.generationName}.`);
  }
  if (
    descriptor.dbGeneration !== SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY.dbGeneration
    || descriptor.targetSchema !== SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY.targetSchema
    || descriptor.migrationId !== SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY.migrationId
    || !sameJson(manifest.database, descriptor)
    || sha256(serializedManifest) !== injectedManifestDigest
    || releaseEvidenceId !== "unbound-local-build"
  ) {
    throw new Error(`SW fixture build release identity drifted: ${input.generationName}.`);
  }
  if (
    !worker.includes(`const CACHE_VERSION = ${JSON.stringify(buildVersion)};`)
    || !worker.includes(JSON.stringify(serializedDescriptor))
    || worker.includes("__CACHE_VERSION__")
    || worker.includes("__RELEASE_DATABASE_DESCRIPTOR__")
  ) {
    throw new Error(`SW fixture worker identity is not bound to index metadata: ${input.generationName}.`);
  }

  const entryPath = index.match(/<script[^>]+src="([^"]+\.js)"/u)?.[1] ?? null;
  const researchRoutePaths = sortedPaths.filter(
    (artifactPath) => /^assets\/research-query-page-.*\.js$/u.test(artifactPath)
  );
  const markerPath = `e2e-sw-generation-${input.generationName}.txt`;
  const markerBytes = bytesByPath.get(markerPath);
  if (
    entryPath === null
    || !entryPath.startsWith("/")
    || !bytesByPath.has(entryPath.slice(1))
    || researchRoutePaths.length !== 1
    || markerBytes?.toString("utf8") !== `${input.generationName}\n`
  ) {
    throw new Error(`SW fixture build is missing its entry, marker, or research route: ${input.generationName}.`);
  }

  const identity = createSwTwoGenerationGenerationArtifactIdentity({
    generationName: input.generationName,
    fault: input.fault,
    buildVersion,
    releaseDescriptorSha256: sha256(serializedDescriptor),
    releaseStorageManifestSha256: injectedManifestDigest,
    files
  });
  const snapshot = Object.freeze({
    name: input.generationName,
    version: buildVersion,
    identity,
    entryPath,
    markerPath: `/${markerPath}`,
    researchRoutePath: `/${researchRoutePaths[0]}`
  });
  artifactSnapshotStates.set(snapshot, Object.freeze({ identity, bytesByPath }));
  return snapshot;
}

export function isSwTwoGenerationArtifactSnapshot(
  value: unknown
): value is SwTwoGenerationArtifactSnapshot {
  if (
    !isRecord(value)
    || !Object.isFrozen(value)
    || !hasExactKeys(value, ARTIFACT_SNAPSHOT_KEYS)
    || !artifactSnapshotStates.has(value)
    || !isExactSwTwoGenerationGenerationArtifactIdentity(value.identity)
    || value.name !== value.identity.generationName
    || value.version !== value.identity.buildVersion
    || typeof value.entryPath !== "string"
    || typeof value.markerPath !== "string"
    || typeof value.researchRoutePath !== "string"
  ) return false;
  const state = artifactSnapshotStates.get(value);
  const publicPaths = [value.entryPath, value.markerPath, value.researchRoutePath];
  return state?.identity === value.identity
    && publicPaths.every((publicPath) =>
      publicPath.startsWith("/")
      && isCanonicalSwTwoGenerationArtifactPath(publicPath.slice(1))
      && state.bytesByPath.has(publicPath.slice(1))
    );
}

export function readSwTwoGenerationArtifactSnapshot(
  snapshot: SwTwoGenerationArtifactSnapshot,
  artifactPath: string
): Buffer | null {
  if (!isSwTwoGenerationArtifactSnapshot(snapshot)) {
    throw new Error("SW fixture server rejected an unregistered artifact snapshot.");
  }
  if (!isCanonicalSwTwoGenerationArtifactPath(artifactPath)) return null;
  const bytes = artifactSnapshotStates.get(snapshot)?.bytesByPath.get(artifactPath);
  return bytes ? Buffer.from(bytes) : null;
}

export function isSwTwoGenerationArtifactSetSnapshot(
  value: unknown
): value is SwTwoGenerationArtifactSetSnapshot {
  if (
    !isRecord(value)
    || !Object.isFrozen(value)
    || !artifactSetSnapshotBrands.has(value)
    || !hasExactKeys(value, ["identity", "generations"])
    || !isExactSwTwoGenerationArtifactSetIdentity(value.identity)
    || !Array.isArray(value.generations)
    || !Object.isFrozen(value.generations)
    || value.generations.length !== SW_TWO_GENERATION_ARTIFACT_GENERATIONS.length
  ) return false;
  const identity = value.identity;
  return value.generations.every((generation, index) =>
      isSwTwoGenerationArtifactSnapshot(generation)
      && generation.identity === identity.generations[index]
  );
}

export async function snapshotSwTwoGenerationArtifactSetDirectory(
  directory: string
): Promise<SwTwoGenerationArtifactSetSnapshot> {
  if (!path.isAbsolute(directory)) {
    throw new Error("SW fixture shared artifact root must be absolute.");
  }
  const resolvedDirectory = path.resolve(directory);
  const directoryStat = await lstat(resolvedDirectory);
  const realDirectory = await realpath(resolvedDirectory);
  if (
    !directoryStat.isDirectory()
    || directoryStat.isSymbolicLink()
    || !sameNativePath(resolvedDirectory, realDirectory)
  ) {
    throw new Error("SW fixture shared artifact root traversed a link or reparse boundary.");
  }
  const entries = await readdir(realDirectory, { withFileTypes: true });
  const expectedNames = SW_TWO_GENERATION_ARTIFACT_GENERATIONS
    .map((entry) => entry.generationName)
    .sort();
  if (
    entries.some((entry) => !entry.isDirectory() || entry.isSymbolicLink())
    || !sameJson(entries.map((entry) => entry.name).sort(), expectedNames)
  ) {
    throw new Error("SW fixture shared artifact root is missing a generation or contains extras.");
  }
  const generations = Object.freeze(await Promise.all(
    SW_TWO_GENERATION_ARTIFACT_GENERATIONS.map((generation) =>
      snapshotSwTwoGenerationArtifactDirectory({
        directory: path.join(realDirectory, generation.generationName),
        generationName: generation.generationName,
        fault: generation.fault
      })
    )
  ));
  const identity = createSwTwoGenerationArtifactSetIdentity(
    generations.map((generation) => generation.identity)
  );
  const snapshot = Object.freeze({ identity, generations });
  artifactSetSnapshotBrands.add(snapshot);
  return snapshot;
}
