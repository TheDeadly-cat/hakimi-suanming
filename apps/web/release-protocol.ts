export const RELEASE_PROTOCOL_VERSION = 1 as const;

export type ReleaseDatabaseDescriptor = {
  protocolVersion: typeof RELEASE_PROTOCOL_VERSION;
  dbGeneration: string;
  databaseName: string;
  targetSchema: number;
  minReadableSchema: number;
  maxReadableSchema: number;
  migrationId: string | null;
  acceptedCommittedMigrationIds: readonly (string | null)[];
  sourceGeneration: string | null;
  sourceDatabaseName: string | null;
  sourceSchema: number | null;
};

export const BRIDGE_RELEASE_DATABASE_DESCRIPTOR: ReleaseDatabaseDescriptor = Object.freeze({
  protocolVersion: RELEASE_PROTOCOL_VERSION,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

/**
 * The first production shadow generation for Schema 14. This descriptor is a
 * release artifact rather than deployment input: environment variables must
 * never be able to alter its source or target database identity.
 */
export const PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR = Object.freeze({
  protocolVersion: RELEASE_PROTOCOL_VERSION,
  dbGeneration: "research-v14-case-activity",
  databaseName: "hakimi-bazi-research.generation.research-v14-case-activity",
  targetSchema: 14,
  minReadableSchema: 14,
  maxReadableSchema: 14,
  migrationId: "v13-to-v14-case-activity-index-v1",
  acceptedCommittedMigrationIds: Object.freeze(["v13-to-v14-case-activity-index-v1"]),
  sourceGeneration: "legacy-v13",
  sourceDatabaseName: "hakimi-bazi-research",
  sourceSchema: 13
} satisfies ReleaseDatabaseDescriptor);

/**
 * Non-default Schema 15 release candidate. Its source identity is derived from
 * the frozen production-v14 descriptor so the candidate cannot silently skip
 * or reinterpret the v14 shadow generation.
 */
export const PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR = Object.freeze({
  protocolVersion: RELEASE_PROTOCOL_VERSION,
  dbGeneration: "research-v15-revision-calculation-receipts",
  databaseName: "hakimi-bazi-research.generation.research-v15-revision-calculation-receipts",
  targetSchema: 15,
  minReadableSchema: 15,
  maxReadableSchema: 15,
  migrationId: "v14-to-v15-revision-calculation-receipts-v1",
  acceptedCommittedMigrationIds: Object.freeze([
    "v14-to-v15-revision-calculation-receipts-v1"
  ]),
  sourceGeneration: PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
  sourceDatabaseName: PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName,
  sourceSchema: PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.targetSchema
} satisfies ReleaseDatabaseDescriptor);

/**
 * Isolated direct-hop candidate for installations whose last confirmed
 * production generation is still the v13 bridge. It deliberately shares the
 * v15 physical target identity with the adjacent v14 -> v15 candidate while
 * using a distinct migration receipt identity and the exact v13 source.
 */
export const PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR = Object.freeze({
  protocolVersion: RELEASE_PROTOCOL_VERSION,
  dbGeneration: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
  databaseName: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName,
  targetSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
  minReadableSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.minReadableSchema,
  maxReadableSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.maxReadableSchema,
  migrationId: "v13-to-v15-revision-calculation-receipts-v1",
  acceptedCommittedMigrationIds: Object.freeze([
    "v13-to-v15-revision-calculation-receipts-v1"
  ]),
  sourceGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
  sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
  sourceSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema
} satisfies ReleaseDatabaseDescriptor);

/**
 * Isolated Schema 16 candidate for the only currently supported installed
 * population: the default v13 bridge. Schema 15 remains a non-default
 * candidate, so this release deliberately performs one self-contained shadow
 * migration instead of requiring users to traverse unpublished shell hops.
 */
export const PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR = Object.freeze({
  protocolVersion: RELEASE_PROTOCOL_VERSION,
  dbGeneration: "research-v16-mutation-state",
  databaseName: "hakimi-bazi-research.generation.research-v16-mutation-state",
  targetSchema: 16,
  minReadableSchema: 16,
  maxReadableSchema: 16,
  migrationId: "v13-to-v16-mutation-state-v1",
  acceptedCommittedMigrationIds: Object.freeze([
    "v13-to-v16-mutation-state-v1"
  ]),
  sourceGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
  sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
  sourceSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema
} satisfies ReleaseDatabaseDescriptor);

const SAFE_IDENTIFIER = /^[a-z0-9][a-z0-9._-]{0,95}$/iu;
const SAFE_DATABASE_NAME = /^[a-z0-9][a-z0-9._-]{0,127}$/iu;

function requireSafeString(value: unknown, field: string, pattern = SAFE_IDENTIFIER): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${field} 必须是安全的非空标识符。`);
  }
  return value;
}

function requireSchema(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 10_000) {
    throw new Error(`${field} 必须是 1～10000 的安全整数。`);
  }
  return Number(value);
}

function nullableSafeString(value: unknown, field: string, pattern = SAFE_IDENTIFIER): string | null {
  if (value === null) return null;
  return requireSafeString(value, field, pattern);
}

function nullableSchema(value: unknown, field: string): number | null {
  return value === null ? null : requireSchema(value, field);
}

function acceptedCommittedMigrationIds(
  value: unknown,
  primaryMigrationId: string | null
): readonly (string | null)[] {
  const entries = value === undefined ? [primaryMigrationId] : value;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 16) {
    throw new Error("acceptedCommittedMigrationIds 必须包含 1～16 个迁移标识。");
  }
  const parsed = entries.map((entry, index) =>
    nullableSafeString(entry, `acceptedCommittedMigrationIds[${index}]`)
  );
  if (parsed.some((entry, index) => parsed.indexOf(entry) !== index)) {
    throw new Error("acceptedCommittedMigrationIds 不能包含重复迁移标识。");
  }
  if (!parsed.includes(primaryMigrationId)) {
    throw new Error("acceptedCommittedMigrationIds 必须包含当前 migrationId。");
  }
  if (
    primaryMigrationId === null
      ? parsed.length !== 1 || parsed[0] !== null
      : parsed.some((entry) => entry === null)
  ) {
    throw new Error("无迁移发布只能接受 null；跨 Schema 发布只能接受非空迁移标识。");
  }
  return Object.freeze(parsed);
}

export function parseReleaseDatabaseDescriptor(input: unknown): ReleaseDatabaseDescriptor {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("发布数据库描述符必须是对象。");
  }
  const value = input as Record<string, unknown>;
  if (value.protocolVersion !== RELEASE_PROTOCOL_VERSION) {
    throw new Error(`不支持的发布协议版本：${String(value.protocolVersion)}`);
  }
  const migrationId = nullableSafeString(value.migrationId, "migrationId");
  const descriptor: ReleaseDatabaseDescriptor = {
    protocolVersion: RELEASE_PROTOCOL_VERSION,
    dbGeneration: requireSafeString(value.dbGeneration, "dbGeneration"),
    databaseName: requireSafeString(value.databaseName, "databaseName", SAFE_DATABASE_NAME),
    targetSchema: requireSchema(value.targetSchema, "targetSchema"),
    minReadableSchema: requireSchema(value.minReadableSchema, "minReadableSchema"),
    maxReadableSchema: requireSchema(value.maxReadableSchema, "maxReadableSchema"),
    migrationId,
    acceptedCommittedMigrationIds: acceptedCommittedMigrationIds(
      value.acceptedCommittedMigrationIds,
      migrationId
    ),
    sourceGeneration: nullableSafeString(value.sourceGeneration, "sourceGeneration"),
    sourceDatabaseName: nullableSafeString(value.sourceDatabaseName, "sourceDatabaseName", SAFE_DATABASE_NAME),
    sourceSchema: nullableSchema(value.sourceSchema, "sourceSchema")
  };
  if (
    descriptor.minReadableSchema > descriptor.targetSchema ||
    descriptor.targetSchema > descriptor.maxReadableSchema
  ) {
    throw new Error("targetSchema 必须位于可读 Schema 范围内。");
  }
  const sourceFields = [
    descriptor.migrationId,
    descriptor.sourceGeneration,
    descriptor.sourceDatabaseName,
    descriptor.sourceSchema
  ];
  const sourceFieldCount = sourceFields.filter((field) => field !== null).length;
  if (sourceFieldCount !== 0 && sourceFieldCount !== sourceFields.length) {
    throw new Error("跨 Schema 发布必须同时声明 migrationId 与完整源数据库代际。");
  }
  if (sourceFieldCount === sourceFields.length) {
    if (descriptor.sourceGeneration === descriptor.dbGeneration) {
      throw new Error("源数据库代际和目标数据库代际不能相同。");
    }
    if (descriptor.sourceDatabaseName === descriptor.databaseName) {
      throw new Error("影子迁移不能覆盖源数据库。");
    }
    if (descriptor.sourceSchema === descriptor.targetSchema) {
      throw new Error("影子迁移必须跨越不同 Schema 版本。");
    }
  }
  return descriptor;
}

function envNullable(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function envSchema(value: string | undefined, fallback: number | null): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return Number(trimmed);
}

function envAcceptedCommittedMigrationIds(value: string | undefined): unknown {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch (cause) {
    throw new Error("HAKIMI_DB_ACCEPTED_COMMITTED_MIGRATION_IDS 必须是合法 JSON 数组。", { cause });
  }
}

export function releaseDatabaseDescriptorFromEnvironment(
  environment: Record<string, string | undefined>
): ReleaseDatabaseDescriptor {
  const targetSchema = envSchema(
    environment.HAKIMI_DB_TARGET_SCHEMA,
    BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema
  );
  return parseReleaseDatabaseDescriptor({
    protocolVersion: RELEASE_PROTOCOL_VERSION,
    dbGeneration: environment.HAKIMI_DB_GENERATION?.trim() || BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
    databaseName: environment.HAKIMI_DB_NAME?.trim() || BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
    targetSchema,
    minReadableSchema: envSchema(environment.HAKIMI_DB_MIN_READABLE_SCHEMA, targetSchema),
    maxReadableSchema: envSchema(environment.HAKIMI_DB_MAX_READABLE_SCHEMA, targetSchema),
    migrationId: envNullable(environment.HAKIMI_DB_MIGRATION_ID),
    acceptedCommittedMigrationIds: envAcceptedCommittedMigrationIds(
      environment.HAKIMI_DB_ACCEPTED_COMMITTED_MIGRATION_IDS
    ),
    sourceGeneration: envNullable(environment.HAKIMI_DB_SOURCE_GENERATION),
    sourceDatabaseName: envNullable(environment.HAKIMI_DB_SOURCE_NAME),
    sourceSchema: envSchema(environment.HAKIMI_DB_SOURCE_SCHEMA, null)
  });
}

/**
 * Selects the descriptor used by the ordinary Vite configuration.
 *
 * A normal development, test, or generic production build is always pinned to
 * the v13 bridge, even if a shell happens to retain HAKIMI_DB_* variables. The
 * environment-driven path exists only for the isolated cross-Schema browser
 * fixture, whose two sentinel variables and explicit config path are set by
 * its harness.
 * Production v14 uses vite.production-v14.config.ts and never enters here.
 */
export function releaseDatabaseDescriptorForDefaultViteBuild(
  environment: Record<string, string | undefined>,
  argv: readonly string[] = []
): ReleaseDatabaseDescriptor {
  const fixtureLabel = environment.HAKIMI_CROSS_SCHEMA_FIXTURE?.trim();
  const fixtureOutputDirectory = environment.HAKIMI_CROSS_SCHEMA_OUT_DIR?.trim();
  const explicitCrossSchemaConfig = argv.some((argument) => (
    /(?:^|\/)vite\.cross-schema-upgrade\.config\.ts$/iu.test(argument.replaceAll("\\", "/"))
  ));
  if (fixtureLabel && fixtureOutputDirectory && explicitCrossSchemaConfig) {
    return releaseDatabaseDescriptorFromEnvironment(environment);
  }
  return BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
}

export function isShadowDatabaseRelease(descriptor: ReleaseDatabaseDescriptor): boolean {
  return descriptor.migrationId !== null;
}
