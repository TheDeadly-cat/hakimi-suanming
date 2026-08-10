import { describe, expect, it } from "vitest";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../../release-protocol";
import {
  bootAcknowledgementMatchesPageIdentity,
  shouldReloadUnboundPreviousGeneration,
  type ServiceWorkerBootAcknowledgement
} from "./service-worker-boot-ack";

const buildVersion = "e2e-v13-build";

function acknowledgement(
  overrides: Partial<ServiceWorkerBootAcknowledgement> = {}
): ServiceWorkerBootAcknowledgement {
  return {
    type: "BOOT_OK_ACK",
    accepted: false,
    reason: "CLIENT_NOT_BOUND_TO_GENERATION",
    buildVersion,
    protocolVersion: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.protocolVersion,
    dbGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
    databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
    targetSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.targetSchema,
    minReadableSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.minReadableSchema,
    maxReadableSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.maxReadableSchema,
    migrationId: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.migrationId,
    acceptedCommittedMigrationIds:
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR.acceptedCommittedMigrationIds,
    sourceGeneration: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.sourceGeneration,
    sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.sourceDatabaseName,
    sourceSchema: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.sourceSchema,
    committedMigrationId: null,
    ...overrides
  };
}

describe("Service Worker BOOT_OK acknowledgement identity", () => {
  it("recognizes an exact acknowledgement for the current page and committed lineage", () => {
    expect(bootAcknowledgementMatchesPageIdentity(
      acknowledgement({ accepted: true, reason: "PREVIOUS_GENERATION_BOUND" }),
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      buildVersion,
      null
    )).toBe(true);
  });

  it("requests convergence reload only for an exact unbound previous-generation rejection", () => {
    expect(shouldReloadUnboundPreviousGeneration(
      acknowledgement(),
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      buildVersion,
      null
    )).toBe(true);
  });

  it.each([
    ["accepted acknowledgement", { accepted: true }],
    ["different rejection", { reason: "GENERATION_NOT_COMPATIBLE" }],
    ["different build", { buildVersion: "other-build" }],
    ["different database", { databaseName: "other-database" }],
    ["different readable range", { maxReadableSchema: 16 }],
    ["different accepted lineage", { acceptedCommittedMigrationIds: ["other"] }],
    ["different committed lineage", { committedMigrationId: "other" }]
  ])("does not reload for %s", (_label, overrides) => {
    expect(shouldReloadUnboundPreviousGeneration(
      acknowledgement(overrides),
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      buildVersion,
      null
    )).toBe(false);
  });
});
