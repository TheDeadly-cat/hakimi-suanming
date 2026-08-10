import { describe, expect, it } from "vitest";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  parseReleaseDatabaseDescriptor,
  releaseDatabaseDescriptorForDefaultViteBuild
} from "../release-protocol";
import {
  DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_VITE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_VITE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_VITE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_VITE_RELEASE_DATABASE_DESCRIPTOR
} from "../vite-release-config";

const productionV14Environment = {
  HAKIMI_DB_GENERATION: "research-v14-case-activity",
  HAKIMI_DB_NAME: "hakimi-bazi-research.generation.research-v14-case-activity",
  HAKIMI_DB_TARGET_SCHEMA: "14",
  HAKIMI_DB_MIN_READABLE_SCHEMA: "14",
  HAKIMI_DB_MAX_READABLE_SCHEMA: "14",
  HAKIMI_DB_MIGRATION_ID: "v13-to-v14-case-activity-index-v1",
  HAKIMI_DB_SOURCE_GENERATION: "legacy-v13",
  HAKIMI_DB_SOURCE_NAME: "hakimi-bazi-research",
  HAKIMI_DB_SOURCE_SCHEMA: "13"
} as const;

describe("release database production configuration", () => {
  it("parses the frozen production v14 descriptor as a separate shadow database", () => {
    expect(Object.isFrozen(PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR)).toBe(true);
    expect(parseReleaseDatabaseDescriptor(PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR)).toEqual({
      protocolVersion: 1,
      dbGeneration: "research-v14-case-activity",
      databaseName: "hakimi-bazi-research.generation.research-v14-case-activity",
      targetSchema: 14,
      minReadableSchema: 14,
      maxReadableSchema: 14,
      migrationId: "v13-to-v14-case-activity-index-v1",
      acceptedCommittedMigrationIds: ["v13-to-v14-case-activity-index-v1"],
      sourceGeneration: "legacy-v13",
      sourceDatabaseName: "hakimi-bazi-research",
      sourceSchema: 13
    });
    expect(PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName).not.toBe(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName
    );
  });

  it("pins the frozen production v15 candidate to the exact production-v14 source", () => {
    expect(Object.isFrozen(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR)).toBe(true);
    expect(parseReleaseDatabaseDescriptor(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR)).toEqual({
      protocolVersion: 1,
      dbGeneration: "research-v15-revision-calculation-receipts",
      databaseName: "hakimi-bazi-research.generation.research-v15-revision-calculation-receipts",
      targetSchema: 15,
      minReadableSchema: 15,
      maxReadableSchema: 15,
      migrationId: "v14-to-v15-revision-calculation-receipts-v1",
      acceptedCommittedMigrationIds: ["v14-to-v15-revision-calculation-receipts-v1"],
      sourceGeneration: "research-v14-case-activity",
      sourceDatabaseName: "hakimi-bazi-research.generation.research-v14-case-activity",
      sourceSchema: 14
    });
    expect(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.sourceGeneration).toBe(
      PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.dbGeneration
    );
    expect(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName).toBe(
      PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.databaseName
    );
    expect(PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.sourceSchema).toBe(
      PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.targetSchema
    );
  });

  it("pins the frozen direct-hop v13-to-v15 candidate to the bridge source and shared v15 target", () => {
    expect(Object.isFrozen(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR)).toBe(true);
    expect(parseReleaseDatabaseDescriptor(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR)).toEqual({
      protocolVersion: 1,
      dbGeneration: "research-v15-revision-calculation-receipts",
      databaseName: "hakimi-bazi-research.generation.research-v15-revision-calculation-receipts",
      targetSchema: 15,
      minReadableSchema: 15,
      maxReadableSchema: 15,
      migrationId: "v13-to-v15-revision-calculation-receipts-v1",
      acceptedCommittedMigrationIds: ["v13-to-v15-revision-calculation-receipts-v1"],
      sourceGeneration: "legacy-v13",
      sourceDatabaseName: "hakimi-bazi-research",
      sourceSchema: 13
    });
    expect(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR).toMatchObject({
      dbGeneration: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      databaseName: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      targetSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
      minReadableSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.minReadableSchema,
      maxReadableSchema: PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.maxReadableSchema,
      sourceGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      sourceSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema
    });
    expect(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId).not.toBe(
      PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId
    );
    expect(PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId).not.toBe(
      PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR.migrationId
    );
  });

  it("pins the isolated v13-to-v16 candidate to the bridge and a new physical target", () => {
    expect(Object.isFrozen(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR)).toBe(true);
    expect(parseReleaseDatabaseDescriptor(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR)).toEqual({
      protocolVersion: 1,
      dbGeneration: "research-v16-mutation-state",
      databaseName: "hakimi-bazi-research.generation.research-v16-mutation-state",
      targetSchema: 16,
      minReadableSchema: 16,
      maxReadableSchema: 16,
      migrationId: "v13-to-v16-mutation-state-v1",
      acceptedCommittedMigrationIds: ["v13-to-v16-mutation-state-v1"],
      sourceGeneration: "legacy-v13",
      sourceDatabaseName: "hakimi-bazi-research",
      sourceSchema: 13
    });
    expect(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR).toMatchObject({
      sourceGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      sourceSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema
    });
    expect(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.databaseName).not.toBe(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName
    );
    expect(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.databaseName).not.toBe(
      PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName
    );
    expect(PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.migrationId).not.toBe(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId
    );
  });

  it("pins an ordinary build to the v13 bridge despite residual database variables", () => {
    expect(releaseDatabaseDescriptorForDefaultViteBuild(productionV14Environment)).toBe(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    );
    expect(DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
  });

  it("normalizes legacy descriptors to their primary id and rejects unsafe committed-id allowlists", () => {
    const legacyShape = {
      ...PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
    } as Record<string, unknown>;
    delete legacyShape.acceptedCommittedMigrationIds;
    expect(parseReleaseDatabaseDescriptor(legacyShape).acceptedCommittedMigrationIds).toEqual([
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId
    ]);

    expect(() => parseReleaseDatabaseDescriptor({
      ...PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      migrationId: "republish-v2",
      acceptedCommittedMigrationIds: [PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId]
    })).toThrow("必须包含当前 migrationId");
    expect(() => parseReleaseDatabaseDescriptor({
      ...PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
      acceptedCommittedMigrationIds: [
        PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId,
        PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId
      ]
    })).toThrow("不能包含重复");
  });

  it("allows environment descriptors only for the explicit cross-Schema fixture", () => {
    const fixtureEnvironment = {
      ...productionV14Environment,
      HAKIMI_CROSS_SCHEMA_FIXTURE: "production-protocol-test",
      HAKIMI_CROSS_SCHEMA_OUT_DIR: "C:/isolated/e2e-output"
    };
    expect(releaseDatabaseDescriptorForDefaultViteBuild(fixtureEnvironment)).toBe(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    );

    const descriptor = releaseDatabaseDescriptorForDefaultViteBuild(
      fixtureEnvironment,
      ["node", "vite", "build", "--config", "C:\\repo\\apps\\web\\vite.cross-schema-upgrade.config.ts"]
    );

    expect(descriptor).toEqual(PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR);
    expect(descriptor).not.toBe(PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR);
  });

  it("binds the explicit production-v14 Vite config to the frozen descriptor", () => {
    expect(PRODUCTION_V14_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(
      PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR
    );
  });

  it("binds the isolated production-v15 Vite config to the frozen candidate descriptor", () => {
    expect(PRODUCTION_V15_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(
      PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR
    );
    expect(DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
  });

  it("binds the isolated v13-to-v15 Vite config without changing the ordinary default", () => {
    expect(PRODUCTION_V13_TO_V15_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR
    );
    expect(DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
  });

  it("binds the isolated v13-to-v16 Vite config without changing the ordinary default", () => {
    expect(PRODUCTION_V13_TO_V16_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(
      PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
    );
    expect(DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR).toBe(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
    expect(releaseDatabaseDescriptorForDefaultViteBuild({
      HAKIMI_DB_GENERATION: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
      HAKIMI_DB_NAME: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.databaseName,
      HAKIMI_DB_TARGET_SCHEMA: "16",
      HAKIMI_DB_MIGRATION_ID: PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.migrationId ?? undefined
    })).toBe(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
  });
});
