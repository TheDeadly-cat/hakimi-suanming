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
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  try {
    for (let index = 0; index < expected.length; index += 1) {
      if (
        !Object.prototype.hasOwnProperty.call(actual, index)
        || actual[index] !== expected[index]
      ) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isCanonicalIdentityText(value: unknown, maximum: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value === value.trim()
    && Array.from(value).length <= maximum
    && !/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(value);
}

function isCanonicalCommittedMigrationId(value: unknown): value is string | null {
  return value === null || isCanonicalIdentityText(value, 128);
}

export function bootAcknowledgementMatchesPageIdentity(
  acknowledgement: ServiceWorkerBootAcknowledgement | null | undefined,
  descriptor: ReleaseDatabaseDescriptor,
  buildVersion: string | undefined,
  committedMigrationId: string | null
): boolean {
  return (
    acknowledgement !== null &&
    typeof acknowledgement === "object" &&
    !Array.isArray(acknowledgement) &&
    isCanonicalIdentityText(buildVersion, 256) &&
    isCanonicalCommittedMigrationId(committedMigrationId) &&
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
