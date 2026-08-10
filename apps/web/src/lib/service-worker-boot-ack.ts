import type { ReleaseDatabaseDescriptor } from "../../release-protocol";

export type ServiceWorkerBootAcknowledgement = Readonly<{
  type?: unknown;
  accepted?: unknown;
  reason?: unknown;
  buildVersion?: unknown;
  protocolVersion?: unknown;
  dbGeneration?: unknown;
  databaseName?: unknown;
  targetSchema?: unknown;
  minReadableSchema?: unknown;
  maxReadableSchema?: unknown;
  migrationId?: unknown;
  acceptedCommittedMigrationIds?: unknown;
  sourceGeneration?: unknown;
  sourceDatabaseName?: unknown;
  sourceSchema?: unknown;
  committedMigrationId?: unknown;
}>;

function sameAcceptedMigrationIds(
  actual: unknown,
  expected: readonly (string | null)[]
): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((entry, index) => entry === expected[index])
  );
}

export function bootAcknowledgementMatchesPageIdentity(
  acknowledgement: ServiceWorkerBootAcknowledgement | null | undefined,
  descriptor: ReleaseDatabaseDescriptor,
  buildVersion: string | undefined,
  committedMigrationId: string | null
): boolean {
  return (
    typeof buildVersion === "string" &&
    acknowledgement?.type === "BOOT_OK_ACK" &&
    acknowledgement.buildVersion === buildVersion &&
    acknowledgement.protocolVersion === descriptor.protocolVersion &&
    acknowledgement.dbGeneration === descriptor.dbGeneration &&
    acknowledgement.databaseName === descriptor.databaseName &&
    acknowledgement.targetSchema === descriptor.targetSchema &&
    acknowledgement.minReadableSchema === descriptor.minReadableSchema &&
    acknowledgement.maxReadableSchema === descriptor.maxReadableSchema &&
    acknowledgement.migrationId === descriptor.migrationId &&
    sameAcceptedMigrationIds(
      acknowledgement.acceptedCommittedMigrationIds,
      descriptor.acceptedCommittedMigrationIds
    ) &&
    acknowledgement.sourceGeneration === descriptor.sourceGeneration &&
    acknowledgement.sourceDatabaseName === descriptor.sourceDatabaseName &&
    acknowledgement.sourceSchema === descriptor.sourceSchema &&
    acknowledgement.committedMigrationId === committedMigrationId
  );
}

export function shouldReloadUnboundPreviousGeneration(
  acknowledgement: ServiceWorkerBootAcknowledgement | null | undefined,
  descriptor: ReleaseDatabaseDescriptor,
  buildVersion: string | undefined,
  committedMigrationId: string | null
): boolean {
  return (
    acknowledgement?.accepted === false &&
    acknowledgement.reason === "CLIENT_NOT_BOUND_TO_GENERATION" &&
    bootAcknowledgementMatchesPageIdentity(
      acknowledgement,
      descriptor,
      buildVersion,
      committedMigrationId
    )
  );
}
