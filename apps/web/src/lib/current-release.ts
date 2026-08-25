import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  BRIDGE_RELEASE_STORAGE_MANIFEST,
  parseReleaseDatabaseDescriptor,
  parseReleaseStorageManifest,
  releaseStorageManifestForDescriptor,
  type ReleaseDatabaseDescriptor,
  type ReleaseStorageManifest
} from "../../release-protocol";

const RELEASE_META_NAME = "hakimi-release-database";
const RELEASE_STORAGE_MANIFEST_META_NAME = "hakimi-release-storage-manifest";
const RELEASE_STORAGE_MANIFEST_DIGEST_META_NAME = "hakimi-release-storage-manifest-digest";
const RELEASE_EVIDENCE_ID_META_NAME = "hakimi-release-evidence-id";
const BUILD_VERSION_META_NAME = "hakimi-build-version";
const BOUND_RELEASE_EVIDENCE_ID = /^hre1-[a-f0-9]{32}$/u;
const UNBOUND_RELEASE_EVIDENCE_ID = "unbound-local-build";
const MAX_RELEASE_DESCRIPTOR_META_CHARACTERS = 16 * 1024;
const MAX_RELEASE_MANIFEST_META_CHARACTERS = 64 * 1024;
const MAX_RELEASE_IDENTITY_META_CHARACTERS = 256;

function readMeta(
  documentLike: Pick<Document, "querySelector"> | undefined,
  name: string,
  maximumCharacters: number
): string | undefined {
  const content = documentLike
    ?.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    ?.content;
  if (content !== undefined && content.length > maximumCharacters) {
    throw new Error(`页面发布元数据 ${name} 超过安全长度上限。`);
  }
  return content;
}

function sameReleaseDatabaseDescriptor(
  left: ReleaseDatabaseDescriptor,
  right: ReleaseDatabaseDescriptor
): boolean {
  return left.protocolVersion === right.protocolVersion &&
    left.dbGeneration === right.dbGeneration &&
    left.databaseName === right.databaseName &&
    left.targetSchema === right.targetSchema &&
    left.minReadableSchema === right.minReadableSchema &&
    left.maxReadableSchema === right.maxReadableSchema &&
    left.migrationId === right.migrationId &&
    left.sourceGeneration === right.sourceGeneration &&
    left.sourceDatabaseName === right.sourceDatabaseName &&
    left.sourceSchema === right.sourceSchema &&
    left.acceptedCommittedMigrationIds.length === right.acceptedCommittedMigrationIds.length &&
    left.acceptedCommittedMigrationIds.every(
      (migrationId, index) => migrationId === right.acceptedCommittedMigrationIds[index]
    );
}

if (
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration !== "legacy-v13" ||
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema !== 13 ||
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR.migrationId !== null
) {
  throw new Error("开发默认发布身份必须保持 legacy-v13 / targetSchema 13 / migrationId null。");
}

export function readCurrentReleaseDatabaseDescriptor(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): ReleaseDatabaseDescriptor {
  const raw = readMeta(
    documentLike,
    RELEASE_META_NAME,
    MAX_RELEASE_DESCRIPTOR_META_CHARACTERS
  );
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少数据库代际描述符。");
    return BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error("页面数据库代际描述符不是合法 JSON。", { cause });
  }
  return parseReleaseDatabaseDescriptor(decoded);
}

export function readCurrentReleaseStorageManifest(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): ReleaseStorageManifest {
  const descriptor = readCurrentReleaseDatabaseDescriptor(documentLike);
  const raw = readMeta(
    documentLike,
    RELEASE_STORAGE_MANIFEST_META_NAME,
    MAX_RELEASE_MANIFEST_META_CHARACTERS
  );
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少发布存储清单。");
    return sameReleaseDatabaseDescriptor(descriptor, BRIDGE_RELEASE_DATABASE_DESCRIPTOR)
      ? BRIDGE_RELEASE_STORAGE_MANIFEST
      : releaseStorageManifestForDescriptor(descriptor);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error("页面发布存储清单不是合法 JSON。", { cause });
  }
  const manifest = parseReleaseStorageManifest(decoded);
  if (!sameReleaseDatabaseDescriptor(manifest.database, descriptor)) {
    throw new Error("页面数据库代际描述符与发布存储清单不一致。");
  }
  return manifest;
}

export function readCurrentReleaseStorageManifestDigest(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): string | null {
  const raw = readMeta(
    documentLike,
    RELEASE_STORAGE_MANIFEST_DIGEST_META_NAME,
    MAX_RELEASE_IDENTITY_META_CHARACTERS
  );
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少发布存储清单摘要。");
    return null;
  }
  if (!/^[a-f0-9]{64}$/u.test(raw)) {
    throw new Error("页面发布存储清单摘要不是规范 SHA-256。");
  }
  return raw;
}

export function readCurrentReleaseEvidenceId(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): string | null {
  const raw = readMeta(
    documentLike,
    RELEASE_EVIDENCE_ID_META_NAME,
    MAX_RELEASE_IDENTITY_META_CHARACTERS
  );
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少发布证据 ID。");
    return null;
  }
  if (raw !== UNBOUND_RELEASE_EVIDENCE_ID && !BOUND_RELEASE_EVIDENCE_ID.test(raw)) {
    throw new Error("页面发布证据 ID 不符合规范。");
  }
  return raw;
}

export function readCurrentBuildVersion(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): string | null {
  const raw = readMeta(
    documentLike,
    BUILD_VERSION_META_NAME,
    MAX_RELEASE_IDENTITY_META_CHARACTERS
  );
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少构建版本摘要。");
    return null;
  }
  if (!/^[a-f0-9]{12}$/u.test(raw)) throw new Error("页面构建版本摘要不符合规范。");
  return raw;
}

export const CURRENT_RELEASE_STORAGE_MANIFEST = readCurrentReleaseStorageManifest();
export const CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST = readCurrentReleaseStorageManifestDigest();
export const CURRENT_RELEASE_EVIDENCE_ID = readCurrentReleaseEvidenceId();
export const CURRENT_BUILD_VERSION = readCurrentBuildVersion();
export const CURRENT_RELEASE_EVIDENCE_BOUND = CURRENT_RELEASE_EVIDENCE_ID !== null
  && BOUND_RELEASE_EVIDENCE_ID.test(CURRENT_RELEASE_EVIDENCE_ID);
export const CURRENT_RELEASE_DATABASE = CURRENT_RELEASE_STORAGE_MANIFEST.database;
export const CURRENT_RELEASE_ENGINEERING_IDENTITY = Object.freeze({
  dbGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
  databaseName: CURRENT_RELEASE_DATABASE.databaseName,
  targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
  migrationId: CURRENT_RELEASE_DATABASE.migrationId,
  buildVersion: CURRENT_BUILD_VERSION,
  manifestDigest: CURRENT_RELEASE_STORAGE_MANIFEST_DIGEST,
  evidenceId: CURRENT_RELEASE_EVIDENCE_ID,
  evidenceBound: CURRENT_RELEASE_EVIDENCE_BOUND,
  engineeringEvidenceOnly: true as const
});
