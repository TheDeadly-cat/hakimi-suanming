import { z } from "zod";
import {
  ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND,
  verifyZiweiBrowserEngineeringArtifactDraft,
  ziweiBrowserEngineeringArtifactDraftSchema,
  type ZiweiBrowserEngineeringArtifactDraft
} from "./browser-artifact-bridge.ts";
import {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  canonicalizeZiweiDigestJson,
  sha256ZiweiCanonicalJson
} from "./contract-bridge.ts";

export const ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME =
  "hakimi-ziwei-browser-workspace-draft" as const;
export const ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION = 1 as const;
export const ZIWEI_BROWSER_WORKSPACE_REVISION_FORMAT =
  "hakimi-ziwei-browser-workspace-revision/0.1-draft" as const;
export const ZIWEI_BROWSER_WORKSPACE_BACKUP_FORMAT =
  "hakimi-ziwei-browser-workspace-backup/0.1-draft" as const;
export const ZIWEI_BROWSER_WORKSPACE_REVISION_MIME =
  "application/vnd.hakimi.ziwei-browser-workspace-revision-draft+json" as const;
export const ZIWEI_BROWSER_WORKSPACE_BACKUP_MIME =
  "application/vnd.hakimi.ziwei-browser-workspace-backup-draft+json" as const;
export const ZIWEI_BROWSER_WORKSPACE_VERIFICATION_SCOPE =
  "complete_structure_and_recomputed_unkeyed_digest_integrity" as const;

export const DEFAULT_MAX_ZIWEI_BROWSER_REVISION_BYTES = 4 * 1024 * 1024;
export const DEFAULT_MAX_ZIWEI_BROWSER_TOTAL_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MAX_ZIWEI_BROWSER_REVISIONS = 512;
export const DEFAULT_MAX_ZIWEI_BROWSER_BACKUP_BYTES = 72 * 1024 * 1024;
const ABSOLUTE_MAX_BACKUP_REVISIONS = 4_096;

const REVISION_STORE = "revisions";
const MUTATION_STATE_STORE = "mutationState";
const CONTENT_INDEX = "byContentSha256";
const MUTATION_STATE_KEY = "singleton" as const;
const ZERO_SHA256 = "0".repeat(64);

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const contentAddressSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const immutableIdSchema = z.string().uuid();
const nonNegativeSafeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const ziweiBrowserWorkspaceBoundaryDraftSchema = z.strictObject({
  isolation: z.literal("isolated_ziwei_browser_workspace_only"),
  productionEligible: z.literal(false),
  expertTruthClaimed: z.literal(false),
  historicalExecutionAuthenticated: z.literal(false),
  baziCaseRevisionLinked: z.literal(false),
  productionDatabaseIncluded: z.literal(false),
  backupScope: z.literal("complete_isolated_ziwei_browser_workspace")
});

export const ziweiBrowserWorkspaceRevisionDraftSchema = z
  .strictObject({
    format: z.literal(ZIWEI_BROWSER_WORKSPACE_REVISION_FORMAT),
    contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
    artifactKind: z.literal("ziwei_browser_workspace_revision"),
    studyId: immutableIdSchema,
    revisionId: immutableIdSchema,
    parentRevisionId: immutableIdSchema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
    title: z.string().trim().min(1).max(160),
    note: z.string().trim().max(1_000),
    browserArtifactKind: z.literal(ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND),
    browserArtifactSha256: sha256Schema,
    artifact: ziweiBrowserEngineeringArtifactDraftSchema,
    boundary: ziweiBrowserWorkspaceBoundaryDraftSchema,
    digestAlgorithm: z.literal(ZIWEI_DIGEST_ALGORITHM),
    verificationScope: z.literal(ZIWEI_BROWSER_WORKSPACE_VERIFICATION_SCOPE),
    contentSha256: sha256Schema,
    contentAddress: contentAddressSchema
  })
  .superRefine((value, context) => {
    if (value.parentRevisionId === value.revisionId) {
      context.addIssue({
        code: "custom",
        path: ["parentRevisionId"],
        message: "A Browser workspace Revision cannot name itself as parent"
      });
    }
    if (value.browserArtifactSha256 !== value.artifact.digests.artifactSha256) {
      context.addIssue({
        code: "custom",
        path: ["browserArtifactSha256"],
        message: "browserArtifactSha256 must bind the embedded Browser artifact"
      });
    }
    if (value.contentAddress !== `sha256:${value.contentSha256}`) {
      context.addIssue({
        code: "custom",
        path: ["contentAddress"],
        message: "Revision contentAddress must be derived from contentSha256"
      });
    }
  });

export const ziweiBrowserWorkspaceRevisionCreateInputDraftSchema = z.strictObject({
  studyId: immutableIdSchema,
  revisionId: immutableIdSchema,
  parentRevisionId: immutableIdSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  title: z.string().trim().min(1).max(160),
  note: z.string().trim().max(1_000),
  artifact: ziweiBrowserEngineeringArtifactDraftSchema
});

export type ZiweiBrowserWorkspaceRevisionDraft = z.infer<
  typeof ziweiBrowserWorkspaceRevisionDraftSchema
>;
export type ZiweiBrowserWorkspaceRevisionCreateInputDraft = z.input<
  typeof ziweiBrowserWorkspaceRevisionCreateInputDraftSchema
>;

export const ziweiBrowserWorkspaceBackupDraftSchema = z
  .strictObject({
    format: z.literal(ZIWEI_BROWSER_WORKSPACE_BACKUP_FORMAT),
    contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
    artifactKind: z.literal("ziwei_browser_workspace_full_backup"),
    exportedAt: z.string().datetime({ offset: true }),
    sourceDatabase: z.strictObject({
      name: z.literal(ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME),
      version: z.literal(ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION),
      epoch: nonNegativeSafeIntegerSchema
    }),
    revisionCount: nonNegativeSafeIntegerSchema,
    totalRevisionBytes: nonNegativeSafeIntegerSchema,
    revisions: z.array(ziweiBrowserWorkspaceRevisionDraftSchema)
      .max(ABSOLUTE_MAX_BACKUP_REVISIONS),
    boundary: z.strictObject({
      scope: z.literal("complete_isolated_ziwei_browser_workspace"),
      includesEveryRevision: z.literal(true),
      productionEligible: z.literal(false),
      expertTruthClaimed: z.literal(false),
      baziDatabaseIncluded: z.literal(false),
      productionDatabaseIncluded: z.literal(false)
    }),
    digestAlgorithm: z.literal(ZIWEI_DIGEST_ALGORITHM),
    verificationScope: z.literal(ZIWEI_BROWSER_WORKSPACE_VERIFICATION_SCOPE),
    contentSha256: sha256Schema,
    contentAddress: contentAddressSchema
  })
  .superRefine((value, context) => {
    if (value.revisionCount !== value.revisions.length) {
      context.addIssue({
        code: "custom",
        path: ["revisionCount"],
        message: "Backup revisionCount must equal the complete revisions array length"
      });
    }
    if (value.contentAddress !== `sha256:${value.contentSha256}`) {
      context.addIssue({
        code: "custom",
        path: ["contentAddress"],
        message: "Backup contentAddress must be derived from contentSha256"
      });
    }
    for (let index = 1; index < value.revisions.length; index += 1) {
      if (value.revisions[index - 1]!.revisionId >= value.revisions[index]!.revisionId) {
        context.addIssue({
          code: "custom",
          path: ["revisions", index, "revisionId"],
          message: "Backup revisions must be unique and sorted by revisionId"
        });
      }
    }
  });

export type ZiweiBrowserWorkspaceBackupDraft = z.infer<
  typeof ziweiBrowserWorkspaceBackupDraftSchema
>;

export type ZiweiBrowserWorkspaceMutationStateDraft = Readonly<{
  epoch: number;
  revisionCount: number;
  totalRevisionBytes: number;
}>;

export type ZiweiBrowserWorkspaceRevisionSummaryDraft = Readonly<{
  studyId: string;
  revisionId: string;
  parentRevisionId: string | null;
  createdAt: string;
  title: string;
  note: string;
  contentSha256: string;
  contentAddress: string;
  browserArtifactSha256: string;
  gregorianDate: string;
  lunarDate: Readonly<{
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
  }>;
  palaceCount: number;
  starCount: number;
}>;

export type ZiweiBrowserWorkspaceSaveResult = Readonly<{
  status: "created" | "already_present";
  revision: ZiweiBrowserWorkspaceRevisionDraft;
  epoch: number;
}>;

export type ZiweiBrowserWorkspaceRestoreResult = Readonly<{
  status: "restored" | "already_present";
  revisionCount: number;
  addedRevisionCount: number;
  alreadyPresentCount: number;
  epoch: number;
}>;

export type ZiweiBrowserWorkspaceRestoreInspectionDraft = Readonly<{
  backupContentSha256: string;
  targetEpoch: number;
  backupRevisionCount: number;
  newRevisionCount: number;
  alreadyPresentCount: number;
  conflictCount: number;
  conflictRevisionIds: readonly string[];
  conflictContentSha256: readonly string[];
  projectedRevisionCount: number;
  projectedTotalRevisionBytes: number;
  capacityExceeded: boolean;
}>;

export type ZiweiBrowserWorkspaceClearResult = Readonly<{
  status: "cleared" | "already_empty";
  removedRevisionCount: number;
  epoch: number;
}>;

export type ZiweiBrowserWorkspaceJsonExportDraft = Readonly<{
  fileName: string;
  mimeType:
    | typeof ZIWEI_BROWSER_WORKSPACE_REVISION_MIME
    | typeof ZIWEI_BROWSER_WORKSPACE_BACKUP_MIME;
  byteLength: number;
  contentSha256: string;
  contentAddress: string;
  bytes: Uint8Array;
  json: string;
}>;

export type ZiweiBrowserWorkspaceDraftErrorCode =
  | "INVALID_UTF8"
  | "INVALID_JSON"
  | "NON_CANONICAL_BYTES"
  | "PAYLOAD_TOO_LARGE"
  | "SCHEMA_INVALID"
  | "ARTIFACT_INVALID"
  | "DIGEST_MISMATCH"
  | "DATABASE_OPEN_FAILED"
  | "DATABASE_VERSION_UNSUPPORTED"
  | "DATABASE_STATE_CORRUPT"
  | "EPOCH_CONFLICT"
  | "REVISION_CONFLICT"
  | "CONTENT_CONFLICT"
  | "PARENT_NOT_FOUND"
  | "PARENT_STUDY_MISMATCH"
  | "LINEAGE_CYCLE"
  | "CAPACITY_EXCEEDED"
  | "REVISION_NOT_FOUND"
  | "CONTENT_NOT_FOUND"
  | "STORED_INDEX_MISMATCH"
  | "BACKUP_CONFLICT"
  | "TRANSACTION_ABORTED";

export class ZiweiBrowserWorkspaceDraftError extends Error {
  readonly code: ZiweiBrowserWorkspaceDraftErrorCode;

  constructor(
    code: ZiweiBrowserWorkspaceDraftErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ZiweiBrowserWorkspaceDraftError";
    this.code = code;
  }
}

type StoredRevisionRecord = Readonly<{
  recordVersion: 1;
  revisionId: string;
  studyId: string;
  parentRevisionId: string | null;
  contentSha256: string;
  contentAddress: string;
  byteLength: number;
  canonicalBytes: Uint8Array;
}>;

type StoredMutationState = Readonly<{
  key: typeof MUTATION_STATE_KEY;
  schemaVersion: typeof ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION;
  epoch: number;
  revisionCount: number;
  totalRevisionBytes: number;
}>;

const storedRevisionRecordSchema = z.strictObject({
  recordVersion: z.literal(1),
  revisionId: immutableIdSchema,
  studyId: immutableIdSchema,
  parentRevisionId: immutableIdSchema.nullable(),
  contentSha256: sha256Schema,
  contentAddress: contentAddressSchema,
  byteLength: nonNegativeSafeIntegerSchema,
  canonicalBytes: z.instanceof(Uint8Array)
});

const storedMutationStateSchema = z.strictObject({
  key: z.literal(MUTATION_STATE_KEY),
  schemaVersion: z.literal(ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION),
  epoch: nonNegativeSafeIntegerSchema,
  revisionCount: nonNegativeSafeIntegerSchema,
  totalRevisionBytes: nonNegativeSafeIntegerSchema
});

const BROWSER_WORKSPACE_BOUNDARY = Object.freeze({
  isolation: "isolated_ziwei_browser_workspace_only",
  productionEligible: false,
  expertTruthClaimed: false,
  historicalExecutionAuthenticated: false,
  baziCaseRevisionLinked: false,
  productionDatabaseIncluded: false,
  backupScope: "complete_isolated_ziwei_browser_workspace"
} as const);

const INITIAL_MUTATION_STATE: StoredMutationState = Object.freeze({
  key: MUTATION_STATE_KEY,
  schemaVersion: ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION,
  epoch: 0,
  revisionCount: 0,
  totalRevisionBytes: 0
});

export function projectZiweiBrowserWorkspaceRevisionForDigest(
  revision: ZiweiBrowserWorkspaceRevisionDraft
): Omit<ZiweiBrowserWorkspaceRevisionDraft, "contentSha256" | "contentAddress"> {
  const {
    contentSha256: _excludedDigest,
    contentAddress: _excludedAddress,
    ...projection
  } = revision;
  return projection;
}

export async function calculateZiweiBrowserWorkspaceRevisionSha256Draft(
  revision: ZiweiBrowserWorkspaceRevisionDraft
): Promise<string> {
  return sha256ZiweiCanonicalJson(projectZiweiBrowserWorkspaceRevisionForDigest(revision));
}

export async function createZiweiBrowserWorkspaceRevisionDraft(
  input: ZiweiBrowserWorkspaceRevisionCreateInputDraft
): Promise<ZiweiBrowserWorkspaceRevisionDraft> {
  const parsedInput = ziweiBrowserWorkspaceRevisionCreateInputDraftSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "SCHEMA_INVALID",
      parsedInput.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    );
  }
  const normalized = parsedInput.data;
  const artifactVerification = await verifyZiweiBrowserEngineeringArtifactDraft(normalized.artifact);
  if (!artifactVerification.success) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "ARTIFACT_INVALID",
      `Embedded Browser engineering artifact failed verification: ${artifactVerification.reason}`
    );
  }

  const provisional = ziweiBrowserWorkspaceRevisionDraftSchema.parse({
    format: ZIWEI_BROWSER_WORKSPACE_REVISION_FORMAT,
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    artifactKind: "ziwei_browser_workspace_revision",
    studyId: normalized.studyId,
    revisionId: normalized.revisionId,
    parentRevisionId: normalized.parentRevisionId,
    createdAt: normalized.createdAt,
    title: normalized.title,
    note: normalized.note,
    browserArtifactKind: ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND,
    browserArtifactSha256: artifactVerification.data.digests.artifactSha256,
    artifact: artifactVerification.data,
    boundary: BROWSER_WORKSPACE_BOUNDARY,
    digestAlgorithm: ZIWEI_DIGEST_ALGORITHM,
    verificationScope: ZIWEI_BROWSER_WORKSPACE_VERIFICATION_SCOPE,
    contentSha256: ZERO_SHA256,
    contentAddress: `sha256:${ZERO_SHA256}`
  });
  const contentSha256 = await calculateZiweiBrowserWorkspaceRevisionSha256Draft(provisional);
  return ziweiBrowserWorkspaceRevisionDraftSchema.parse({
    ...provisional,
    contentSha256,
    contentAddress: `sha256:${contentSha256}`
  });
}

export async function verifyZiweiBrowserWorkspaceRevisionDraft(
  candidate: unknown
): Promise<Readonly<{
  success: true;
  data: ZiweiBrowserWorkspaceRevisionDraft;
  contentSha256: string;
}> | Readonly<{
  success: false;
  reason:
    | "schema_invalid"
    | "schema_normalized_input"
    | "artifact_invalid"
    | "digest_calculation_failed"
    | "digest_mismatch";
  message: string;
}>> {
  const parsed = ziweiBrowserWorkspaceRevisionDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      reason: "schema_invalid",
      message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    };
  }
  try {
    if (canonicalizeZiweiDigestJson(candidate) !== canonicalizeZiweiDigestJson(parsed.data)) {
      return {
        success: false,
        reason: "schema_normalized_input",
        message: "Browser workspace Revision changed during strict Schema normalization"
      };
    }
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: errorMessage(cause, "Revision is not canonical JSON")
    };
  }

  const artifactVerification = await verifyZiweiBrowserEngineeringArtifactDraft(parsed.data.artifact);
  if (!artifactVerification.success) {
    return {
      success: false,
      reason: "artifact_invalid",
      message: `Embedded Browser engineering artifact failed verification: ${artifactVerification.reason}`
    };
  }

  let contentSha256: string;
  try {
    contentSha256 = await calculateZiweiBrowserWorkspaceRevisionSha256Draft(parsed.data);
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: errorMessage(cause, "Revision digest calculation failed")
    };
  }
  if (parsed.data.browserArtifactSha256 !== artifactVerification.data.digests.artifactSha256
    || parsed.data.contentSha256 !== contentSha256
    || parsed.data.contentAddress !== `sha256:${contentSha256}`) {
    return {
      success: false,
      reason: "digest_mismatch",
      message: "Browser workspace Revision content address or embedded artifact binding mismatched"
    };
  }
  return { success: true, data: parsed.data, contentSha256 };
}

export function serializeZiweiBrowserWorkspaceRevisionDraft(
  revision: ZiweiBrowserWorkspaceRevisionDraft
): string {
  return canonicalizeZiweiDigestJson(ziweiBrowserWorkspaceRevisionDraftSchema.parse(revision));
}

export async function preflightZiweiBrowserWorkspaceRevisionJsonDraft(
  raw: string | Uint8Array,
  options: Readonly<{ maxBytes?: number }> = {}
): Promise<ZiweiBrowserWorkspaceRevisionDraft> {
  const maxBytes = positiveSafeInteger(
    options.maxBytes ?? DEFAULT_MAX_ZIWEI_BROWSER_REVISION_BYTES,
    "maxBytes"
  );
  const { candidate, canonicalJson } = parseCanonicalJsonBytes(raw, maxBytes, "Revision");
  const verification = await verifyZiweiBrowserWorkspaceRevisionDraft(candidate);
  if (!verification.success) {
    const code = verification.reason === "artifact_invalid"
      ? "ARTIFACT_INVALID"
      : verification.reason === "digest_mismatch"
        ? "DIGEST_MISMATCH"
        : "SCHEMA_INVALID";
    throw new ZiweiBrowserWorkspaceDraftError(code, verification.message);
  }
  if (serializeZiweiBrowserWorkspaceRevisionDraft(verification.data) !== canonicalJson) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "NON_CANONICAL_BYTES",
      "Revision bytes do not exactly match the verified canonical serialization"
    );
  }
  return verification.data;
}

export function projectZiweiBrowserWorkspaceBackupForDigest(
  backup: ZiweiBrowserWorkspaceBackupDraft
): Omit<ZiweiBrowserWorkspaceBackupDraft, "contentSha256" | "contentAddress"> {
  const {
    contentSha256: _excludedDigest,
    contentAddress: _excludedAddress,
    ...projection
  } = backup;
  return projection;
}

export async function calculateZiweiBrowserWorkspaceBackupSha256Draft(
  backup: ZiweiBrowserWorkspaceBackupDraft
): Promise<string> {
  return sha256ZiweiCanonicalJson(projectZiweiBrowserWorkspaceBackupForDigest(backup));
}

export function serializeZiweiBrowserWorkspaceBackupDraft(
  backup: ZiweiBrowserWorkspaceBackupDraft
): string {
  return canonicalizeZiweiDigestJson(ziweiBrowserWorkspaceBackupDraftSchema.parse(backup));
}

export async function verifyZiweiBrowserWorkspaceBackupDraft(
  candidate: unknown
): Promise<ZiweiBrowserWorkspaceBackupDraft> {
  const parsed = ziweiBrowserWorkspaceBackupDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "SCHEMA_INVALID",
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    );
  }
  let rawCanonical: string;
  let parsedCanonical: string;
  try {
    rawCanonical = canonicalizeZiweiDigestJson(candidate);
    parsedCanonical = canonicalizeZiweiDigestJson(parsed.data);
  } catch (cause) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "SCHEMA_INVALID",
      errorMessage(cause, "Backup is not canonical JSON"),
      { cause }
    );
  }
  if (rawCanonical !== parsedCanonical) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "SCHEMA_INVALID",
      "Backup changed during strict Schema normalization"
    );
  }

  let totalRevisionBytes = 0;
  for (const revision of parsed.data.revisions) {
    const verification = await verifyZiweiBrowserWorkspaceRevisionDraft(revision);
    if (!verification.success) {
      const code = verification.reason === "artifact_invalid" ? "ARTIFACT_INVALID" : "DIGEST_MISMATCH";
      throw new ZiweiBrowserWorkspaceDraftError(
        code,
        `Backup Revision ${revision.revisionId} failed verification: ${verification.message}`
      );
    }
    totalRevisionBytes += utf8Bytes(serializeZiweiBrowserWorkspaceRevisionDraft(revision)).byteLength;
  }
  if (parsed.data.totalRevisionBytes !== totalRevisionBytes) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DIGEST_MISMATCH",
      "Backup totalRevisionBytes does not equal the canonical Revision byte total"
    );
  }
  verifyCompleteLineage(parsed.data.revisions);
  const contentSha256 = await calculateZiweiBrowserWorkspaceBackupSha256Draft(parsed.data);
  if (parsed.data.contentSha256 !== contentSha256
    || parsed.data.contentAddress !== `sha256:${contentSha256}`) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DIGEST_MISMATCH",
      "Backup content address does not match its canonical complete contents"
    );
  }
  return parsed.data;
}

export async function preflightZiweiBrowserWorkspaceBackupJsonDraft(
  raw: string | Uint8Array,
  options: Readonly<{ maxBytes?: number }> = {}
): Promise<ZiweiBrowserWorkspaceBackupDraft> {
  const maxBytes = positiveSafeInteger(
    options.maxBytes ?? DEFAULT_MAX_ZIWEI_BROWSER_BACKUP_BYTES,
    "maxBytes"
  );
  const { candidate, canonicalJson } = parseCanonicalJsonBytes(raw, maxBytes, "Backup");
  const backup = await verifyZiweiBrowserWorkspaceBackupDraft(candidate);
  if (serializeZiweiBrowserWorkspaceBackupDraft(backup) !== canonicalJson) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "NON_CANONICAL_BYTES",
      "Backup bytes do not exactly match the verified canonical serialization"
    );
  }
  return backup;
}

export class IndexedDbZiweiBrowserWorkspaceDraft {
  readonly #indexedDb: IDBFactory;
  readonly maxRevisionBytes: number;
  readonly maxTotalBytes: number;
  readonly maxRevisions: number;
  readonly maxBackupBytes: number;

  constructor(
    indexedDb: IDBFactory,
    options: Readonly<{
      maxRevisionBytes?: number;
      maxTotalBytes?: number;
      maxRevisions?: number;
      maxBackupBytes?: number;
    }> = {}
  ) {
    this.#indexedDb = indexedDb;
    this.maxRevisionBytes = positiveSafeInteger(
      options.maxRevisionBytes ?? DEFAULT_MAX_ZIWEI_BROWSER_REVISION_BYTES,
      "maxRevisionBytes"
    );
    this.maxTotalBytes = positiveSafeInteger(
      options.maxTotalBytes ?? DEFAULT_MAX_ZIWEI_BROWSER_TOTAL_BYTES,
      "maxTotalBytes"
    );
    this.maxRevisions = positiveSafeInteger(
      options.maxRevisions ?? DEFAULT_MAX_ZIWEI_BROWSER_REVISIONS,
      "maxRevisions"
    );
    this.maxBackupBytes = positiveSafeInteger(
      options.maxBackupBytes ?? DEFAULT_MAX_ZIWEI_BROWSER_BACKUP_BYTES,
      "maxBackupBytes"
    );
    if (this.maxRevisions > ABSOLUTE_MAX_BACKUP_REVISIONS) {
      throw new RangeError(`maxRevisions cannot exceed ${ABSOLUTE_MAX_BACKUP_REVISIONS}`);
    }
  }

  async getMutationState(): Promise<ZiweiBrowserWorkspaceMutationStateDraft> {
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      const snapshot = await readStoredSnapshot(database);
      return publicMutationState(snapshot.state);
    } finally {
      database.close();
    }
  }

  async listRecentRevisions(
    limit = 50
  ): Promise<readonly ZiweiBrowserWorkspaceRevisionSummaryDraft[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new RangeError("limit must be a safe integer from 1 through 100");
    }
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    let snapshot: StoredSnapshot;
    try {
      snapshot = await readStoredSnapshot(database);
    } finally {
      database.close();
    }
    const revisions: ZiweiBrowserWorkspaceRevisionDraft[] = [];
    for (const record of snapshot.records) {
      revisions.push(await verifyStoredRecord(record, this.maxRevisionBytes));
    }
    verifyCompleteLineage(revisions);
    revisions.sort((left, right) => {
      const byCreatedAt = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return byCreatedAt !== 0
        ? byCreatedAt
        : right.revisionId.localeCompare(left.revisionId);
    });
    return revisions.slice(0, limit).map(summarizeRevision);
  }

  async saveRevision(
    input: ZiweiBrowserWorkspaceRevisionCreateInputDraft,
    expectedEpoch: number
  ): Promise<ZiweiBrowserWorkspaceSaveResult> {
    const validExpectedEpoch = epoch(expectedEpoch);
    const revision = await createZiweiBrowserWorkspaceRevisionDraft(input);
    const canonicalBytes = utf8Bytes(serializeZiweiBrowserWorkspaceRevisionDraft(revision));
    if (canonicalBytes.byteLength > this.maxRevisionBytes) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PAYLOAD_TOO_LARGE",
        `Browser workspace Revision exceeds the ${this.maxRevisionBytes}-byte limit`
      );
    }
    return this.#savePreparedRevision(revision, canonicalBytes, validExpectedEpoch);
  }

  async reopenRevision(revisionId: string): Promise<ZiweiBrowserWorkspaceRevisionDraft> {
    const validRevisionId = immutableIdSchema.parse(revisionId);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      const transaction = database.transaction(
        [REVISION_STORE, MUTATION_STATE_STORE],
        "readonly"
      );
      const done = transactionFinished(transaction);
      const revisionStore = transaction.objectStore(REVISION_STORE);
      const [rawState, rawRecords, rawRecord] = await Promise.all([
        requestResult(transaction.objectStore(MUTATION_STATE_STORE).get(MUTATION_STATE_KEY)),
        requestResult(revisionStore.getAll()),
        requestResult(revisionStore.get(validRevisionId))
      ]);
      await done;
      const { records } = validateStoredSnapshot(rawState, rawRecords);
      if (rawRecord === undefined) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "REVISION_NOT_FOUND",
          `Browser workspace Revision ${validRevisionId} was not found`
        );
      }
      const record = parseStoredRevision(rawRecord);
      if (!records.some((item) => sameStoredRecord(item, record))) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "STORED_INDEX_MISMATCH",
          "Revision lookup result does not belong to the verified database snapshot"
        );
      }
      const revision = await verifyStoredRecord(record, this.maxRevisionBytes);
      if (revision.revisionId !== validRevisionId) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "STORED_INDEX_MISMATCH",
          "Stored canonical bytes do not match the revisionId key"
        );
      }
      await verifyStoredLineage(records, revision, this.maxRevisionBytes);
      return revision;
    } catch (cause) {
      return throwNormalizedTransactionFailure(cause);
    } finally {
      database.close();
    }
  }

  async reopenContent(contentSha256: string): Promise<ZiweiBrowserWorkspaceRevisionDraft> {
    const validContentSha256 = sha256Schema.parse(contentSha256);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      const transaction = database.transaction(
        [REVISION_STORE, MUTATION_STATE_STORE],
        "readonly"
      );
      const done = transactionFinished(transaction);
      const revisionStore = transaction.objectStore(REVISION_STORE);
      const [rawState, rawRecords, rawRecord] = await Promise.all([
        requestResult(transaction.objectStore(MUTATION_STATE_STORE).get(MUTATION_STATE_KEY)),
        requestResult(revisionStore.getAll()),
        requestResult(revisionStore.index(CONTENT_INDEX).get(validContentSha256))
      ]);
      await done;
      const { records } = validateStoredSnapshot(rawState, rawRecords);
      if (rawRecord === undefined) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "CONTENT_NOT_FOUND",
          `Browser workspace content ${validContentSha256} was not found`
        );
      }
      const record = parseStoredRevision(rawRecord);
      if (!records.some((item) => sameStoredRecord(item, record))) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "STORED_INDEX_MISMATCH",
          "Content lookup result does not belong to the verified database snapshot"
        );
      }
      const revision = await verifyStoredRecord(record, this.maxRevisionBytes);
      if (revision.contentSha256 !== validContentSha256) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "STORED_INDEX_MISMATCH",
          "Stored canonical bytes do not match the content SHA-256 index"
        );
      }
      await verifyStoredLineage(records, revision, this.maxRevisionBytes);
      return revision;
    } catch (cause) {
      return throwNormalizedTransactionFailure(cause);
    } finally {
      database.close();
    }
  }

  async exportRevision(revisionId: string): Promise<ZiweiBrowserWorkspaceJsonExportDraft> {
    const revision = await this.reopenRevision(revisionId);
    const json = serializeZiweiBrowserWorkspaceRevisionDraft(revision);
    const bytes = utf8Bytes(json);
    return {
      fileName: `hakimi-ziwei-browser-${revision.studyId}-${revision.revisionId}.json`,
      mimeType: ZIWEI_BROWSER_WORKSPACE_REVISION_MIME,
      byteLength: bytes.byteLength,
      contentSha256: revision.contentSha256,
      contentAddress: revision.contentAddress,
      bytes,
      json
    };
  }

  async importRevision(
    raw: string | Uint8Array,
    expectedEpoch: number,
    options: Readonly<{ maxBytes?: number }> = {}
  ): Promise<ZiweiBrowserWorkspaceSaveResult> {
    const requestedLimit = positiveSafeInteger(
      options.maxBytes ?? this.maxRevisionBytes,
      "maxBytes"
    );
    const revision = await preflightZiweiBrowserWorkspaceRevisionJsonDraft(raw, {
      maxBytes: Math.min(requestedLimit, this.maxRevisionBytes)
    });
    return this.#saveVerifiedRevision(revision, expectedEpoch);
  }

  async #saveVerifiedRevision(
    revision: ZiweiBrowserWorkspaceRevisionDraft,
    expectedEpoch: number
  ): Promise<ZiweiBrowserWorkspaceSaveResult> {
    const verification = await verifyZiweiBrowserWorkspaceRevisionDraft(revision);
    if (!verification.success) {
      const code: ZiweiBrowserWorkspaceDraftErrorCode = verification.reason === "artifact_invalid"
        ? "ARTIFACT_INVALID"
        : verification.reason === "digest_mismatch"
          ? "DIGEST_MISMATCH"
          : "SCHEMA_INVALID";
      throw new ZiweiBrowserWorkspaceDraftError(
        code,
        verification.message
      );
    }
    const canonicalBytes = utf8Bytes(serializeZiweiBrowserWorkspaceRevisionDraft(verification.data));
    if (canonicalBytes.byteLength > this.maxRevisionBytes) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PAYLOAD_TOO_LARGE",
        `Browser workspace Revision exceeds the ${this.maxRevisionBytes}-byte limit`
      );
    }
    return this.#savePreparedRevision(verification.data, canonicalBytes, epoch(expectedEpoch));
  }

  async #savePreparedRevision(
    revision: ZiweiBrowserWorkspaceRevisionDraft,
    canonicalBytes: Uint8Array,
    expectedEpoch: number
  ): Promise<ZiweiBrowserWorkspaceSaveResult> {
    const record = recordFor(revision, canonicalBytes);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      const beforeMutation = await readStoredSnapshot(database);
      await verifyStoredSnapshotContents(beforeMutation, this.maxRevisionBytes);
      return await runReadWrite(database, async (transaction) => {
        const revisionStore = transaction.objectStore(REVISION_STORE);
        const stateStore = transaction.objectStore(MUTATION_STATE_STORE);
        const [rawState, rawRecords] = await Promise.all([
          requestResult(stateStore.get(MUTATION_STATE_KEY)),
          requestResult(revisionStore.getAll())
        ]);
        const { state, records } = validateStoredSnapshot(rawState, rawRecords);
        requireExpectedEpoch(state, expectedEpoch);
        const sameId = records.find((item) => item.revisionId === revision.revisionId);
        if (sameId) {
          if (sameStoredRecord(sameId, record)) {
            return { status: "already_present", revision, epoch: state.epoch } as const;
          }
          throw new ZiweiBrowserWorkspaceDraftError(
            "REVISION_CONFLICT",
            "The immutable revisionId already addresses different canonical bytes"
          );
        }
        if (records.some((item) => item.contentSha256 === revision.contentSha256)) {
          throw new ZiweiBrowserWorkspaceDraftError(
            "CONTENT_CONFLICT",
            "The content SHA-256 already indexes another immutable Revision"
          );
        }
        requireStoredParent(records, revision);
        requireCapacity(
          state.revisionCount + 1,
          state.totalRevisionBytes + record.byteLength,
          this.maxRevisions,
          this.maxTotalBytes
        );
        const nextState: StoredMutationState = {
          ...state,
          epoch: incrementEpoch(state.epoch),
          revisionCount: state.revisionCount + 1,
          totalRevisionBytes: state.totalRevisionBytes + record.byteLength
        };
        revisionStore.add(record);
        stateStore.put(nextState);
        return { status: "created", revision, epoch: nextState.epoch } as const;
      });
    } finally {
      database.close();
    }
  }

  async exportFullBackup(
    options: Readonly<{ exportedAt?: string }> = {}
  ): Promise<ZiweiBrowserWorkspaceJsonExportDraft> {
    const exportedAt = z.string().datetime({ offset: true }).parse(
      options.exportedAt ?? new Date().toISOString()
    );
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    let snapshot: StoredSnapshot;
    try {
      snapshot = await readStoredSnapshot(database);
    } finally {
      database.close();
    }
    const revisions: ZiweiBrowserWorkspaceRevisionDraft[] = [];
    for (const record of snapshot.records) {
      revisions.push(await verifyStoredRecord(record, this.maxRevisionBytes));
    }
    revisions.sort((left, right) => left.revisionId.localeCompare(right.revisionId));
    verifyCompleteLineage(revisions);
    const provisional = ziweiBrowserWorkspaceBackupDraftSchema.parse({
      format: ZIWEI_BROWSER_WORKSPACE_BACKUP_FORMAT,
      contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
      systemId: ZIWEI_DOUSHU_SYSTEM_ID,
      artifactKind: "ziwei_browser_workspace_full_backup",
      exportedAt,
      sourceDatabase: {
        name: ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME,
        version: ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION,
        epoch: snapshot.state.epoch
      },
      revisionCount: revisions.length,
      totalRevisionBytes: snapshot.state.totalRevisionBytes,
      revisions,
      boundary: {
        scope: "complete_isolated_ziwei_browser_workspace",
        includesEveryRevision: true,
        productionEligible: false,
        expertTruthClaimed: false,
        baziDatabaseIncluded: false,
        productionDatabaseIncluded: false
      },
      digestAlgorithm: ZIWEI_DIGEST_ALGORITHM,
      verificationScope: ZIWEI_BROWSER_WORKSPACE_VERIFICATION_SCOPE,
      contentSha256: ZERO_SHA256,
      contentAddress: `sha256:${ZERO_SHA256}`
    });
    const contentSha256 = await calculateZiweiBrowserWorkspaceBackupSha256Draft(provisional);
    const backup = await verifyZiweiBrowserWorkspaceBackupDraft({
      ...provisional,
      contentSha256,
      contentAddress: `sha256:${contentSha256}`
    });
    const json = serializeZiweiBrowserWorkspaceBackupDraft(backup);
    const bytes = utf8Bytes(json);
    if (bytes.byteLength > this.maxBackupBytes) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PAYLOAD_TOO_LARGE",
        `Complete Browser workspace backup exceeds the ${this.maxBackupBytes}-byte limit`
      );
    }
    return {
      fileName: `hakimi-ziwei-browser-workspace-${exportedAt.replaceAll(":", "-")}.json`,
      mimeType: ZIWEI_BROWSER_WORKSPACE_BACKUP_MIME,
      byteLength: bytes.byteLength,
      contentSha256: backup.contentSha256,
      contentAddress: backup.contentAddress,
      bytes,
      json
    };
  }

  async inspectFullBackupRestore(
    raw: string | Uint8Array,
    options: Readonly<{ maxBytes?: number }> = {}
  ): Promise<ZiweiBrowserWorkspaceRestoreInspectionDraft> {
    const requestedLimit = positiveSafeInteger(
      options.maxBytes ?? this.maxBackupBytes,
      "maxBytes"
    );
    const backup = await preflightZiweiBrowserWorkspaceBackupJsonDraft(raw, {
      maxBytes: Math.min(requestedLimit, this.maxBackupBytes)
    });
    const prepared = prepareBackupRecords(backup, this.maxRevisionBytes);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    let snapshot: StoredSnapshot;
    try {
      snapshot = await readStoredSnapshot(database);
    } finally {
      database.close();
    }
    await verifyStoredSnapshotContents(snapshot, this.maxRevisionBytes);
    const classification = classifyBackupRecords(snapshot.records, prepared);
    const addedBytes = classification.newRecords.reduce(
      (total, record) => total + record.byteLength,
      0
    );
    const capacityExceeded = !Number.isSafeInteger(
      snapshot.state.totalRevisionBytes + addedBytes
    ) || snapshot.state.revisionCount + classification.newRecords.length > this.maxRevisions
      || snapshot.state.totalRevisionBytes + addedBytes > this.maxTotalBytes;
    const conflictCount = classification.conflictRevisionIds.length
      + classification.conflictContentSha256.length;
    return {
      backupContentSha256: backup.contentSha256,
      targetEpoch: snapshot.state.epoch,
      backupRevisionCount: backup.revisionCount,
      newRevisionCount: classification.newRecords.length,
      alreadyPresentCount: classification.alreadyPresentCount,
      conflictCount,
      conflictRevisionIds: Object.freeze([...classification.conflictRevisionIds]),
      conflictContentSha256: Object.freeze([...classification.conflictContentSha256]),
      projectedRevisionCount: snapshot.state.revisionCount + classification.newRecords.length,
      projectedTotalRevisionBytes: snapshot.state.totalRevisionBytes + addedBytes,
      capacityExceeded
    };
  }

  async restoreFullBackup(
    raw: string | Uint8Array,
    expectedEpoch: number,
    options: Readonly<{ maxBytes?: number }> = {}
  ): Promise<ZiweiBrowserWorkspaceRestoreResult> {
    const requestedLimit = positiveSafeInteger(
      options.maxBytes ?? this.maxBackupBytes,
      "maxBytes"
    );
    const backup = await preflightZiweiBrowserWorkspaceBackupJsonDraft(raw, {
      maxBytes: Math.min(requestedLimit, this.maxBackupBytes)
    });
    const prepared = prepareBackupRecords(backup, this.maxRevisionBytes);
    const validExpectedEpoch = epoch(expectedEpoch);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      const beforeMutation = await readStoredSnapshot(database);
      await verifyStoredSnapshotContents(beforeMutation, this.maxRevisionBytes);
      return await runReadWrite(database, async (transaction) => {
        const revisionStore = transaction.objectStore(REVISION_STORE);
        const stateStore = transaction.objectStore(MUTATION_STATE_STORE);
        const [rawState, rawRecords] = await Promise.all([
          requestResult(stateStore.get(MUTATION_STATE_KEY)),
          requestResult(revisionStore.getAll())
        ]);
        const { state, records } = validateStoredSnapshot(rawState, rawRecords);
        requireExpectedEpoch(state, validExpectedEpoch);
        const classification = classifyBackupRecords(records, prepared);
        if (classification.conflictRevisionIds.length > 0
          || classification.conflictContentSha256.length > 0) {
          throw new ZiweiBrowserWorkspaceDraftError(
            "BACKUP_CONFLICT",
            "Complete restore found an immutable Revision or content-address conflict"
          );
        }
        if (classification.newRecords.length === 0) {
          return {
            status: "already_present",
            revisionCount: backup.revisionCount,
            addedRevisionCount: 0,
            alreadyPresentCount: classification.alreadyPresentCount,
            epoch: state.epoch
          } as const;
        }
        const addedBytes = classification.newRecords.reduce(
          (total, record) => total + record.byteLength,
          0
        );
        requireCapacity(
          state.revisionCount + classification.newRecords.length,
          state.totalRevisionBytes + addedBytes,
          this.maxRevisions,
          this.maxTotalBytes
        );
        const nextState: StoredMutationState = {
          ...state,
          epoch: incrementEpoch(state.epoch),
          revisionCount: state.revisionCount + classification.newRecords.length,
          totalRevisionBytes: state.totalRevisionBytes + addedBytes
        };
        for (const record of classification.newRecords) revisionStore.add(record);
        stateStore.put(nextState);
        return {
          status: "restored",
          revisionCount: backup.revisionCount,
          addedRevisionCount: classification.newRecords.length,
          alreadyPresentCount: classification.alreadyPresentCount,
          epoch: nextState.epoch
        } as const;
      });
    } finally {
      database.close();
    }
  }

  /**
   * The sole deletion exception. It removes only this package's independently
   * named draft database records and advances the same CAS epoch atomically.
   */
  async clearAll(expectedEpoch: number): Promise<ZiweiBrowserWorkspaceClearResult> {
    const validExpectedEpoch = epoch(expectedEpoch);
    const database = await openBrowserWorkspaceDatabase(this.#indexedDb);
    try {
      return await runReadWrite(database, async (transaction) => {
        const revisionStore = transaction.objectStore(REVISION_STORE);
        const stateStore = transaction.objectStore(MUTATION_STATE_STORE);
        const [rawState, rawRecords] = await Promise.all([
          requestResult(stateStore.get(MUTATION_STATE_KEY)),
          requestResult(revisionStore.getAll())
        ]);
        const { state, records } = validateStoredSnapshot(rawState, rawRecords);
        requireExpectedEpoch(state, validExpectedEpoch);
        if (records.length === 0) {
          return { status: "already_empty", removedRevisionCount: 0, epoch: state.epoch } as const;
        }
        const nextState: StoredMutationState = {
          ...state,
          epoch: incrementEpoch(state.epoch),
          revisionCount: 0,
          totalRevisionBytes: 0
        };
        revisionStore.clear();
        stateStore.put(nextState);
        return {
          status: "cleared",
          removedRevisionCount: records.length,
          epoch: nextState.epoch
        } as const;
      });
    } finally {
      database.close();
    }
  }
}

type StoredSnapshot = Readonly<{
  state: StoredMutationState;
  records: readonly StoredRevisionRecord[];
}>;

async function openBrowserWorkspaceDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    let request: IDBOpenDBRequest;
    try {
      request = indexedDb.open(
        ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME,
        ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION
      );
    } catch (cause) {
      reject(new ZiweiBrowserWorkspaceDraftError(
        "DATABASE_OPEN_FAILED",
        "The isolated Browser workspace database API is unavailable",
        { cause }
      ));
      return;
    }
    request.onupgradeneeded = (event) => {
      if (event.oldVersion !== 0) {
        request.transaction?.abort();
        reject(new ZiweiBrowserWorkspaceDraftError(
          "DATABASE_VERSION_UNSUPPORTED",
          `Unsupported Browser workspace database upgrade from version ${event.oldVersion}`
        ));
        settled = true;
        return;
      }
      const database = request.result;
      const revisions = database.createObjectStore(REVISION_STORE, { keyPath: "revisionId" });
      revisions.createIndex(CONTENT_INDEX, "contentSha256", { unique: true });
      const mutationState = database.createObjectStore(MUTATION_STATE_STORE, { keyPath: "key" });
      mutationState.add(INITIAL_MUTATION_STATE);
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      try {
        assertBrowserWorkspaceDatabaseShape(database);
      } catch (cause) {
        database.close();
        settled = true;
        reject(cause);
        return;
      }
      database.onversionchange = () => database.close();
      settled = true;
      resolve(database);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      const code = request.error?.name === "VersionError"
        ? "DATABASE_VERSION_UNSUPPORTED"
        : "DATABASE_OPEN_FAILED";
      reject(new ZiweiBrowserWorkspaceDraftError(
        code,
        `Unable to open the isolated Browser workspace database: ${request.error?.message ?? "unknown IndexedDB error"}`,
        { cause: request.error ?? undefined }
      ));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new ZiweiBrowserWorkspaceDraftError(
        "DATABASE_OPEN_FAILED",
        "Opening the isolated Browser workspace database was blocked by another connection"
      ));
    };
  });
}

function assertBrowserWorkspaceDatabaseShape(database: IDBDatabase): void {
  const storeNames = Array.from(database.objectStoreNames).sort();
  if (database.name !== ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME
    || database.version !== ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION
    || storeNames.length !== 2
    || storeNames[0] !== MUTATION_STATE_STORE
    || storeNames[1] !== REVISION_STORE) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "The isolated Browser workspace database identity or object-store set is invalid"
    );
  }
  let transaction: IDBTransaction;
  try {
    transaction = database.transaction([REVISION_STORE, MUTATION_STATE_STORE], "readonly");
    const revisions = transaction.objectStore(REVISION_STORE);
    const mutationState = transaction.objectStore(MUTATION_STATE_STORE);
    const contentIndex = revisions.index(CONTENT_INDEX);
    const revisionIndexNames = Array.from(revisions.indexNames);
    if (revisions.keyPath !== "revisionId"
      || revisions.autoIncrement
      || revisionIndexNames.length !== 1
      || revisionIndexNames[0] !== CONTENT_INDEX
      || contentIndex.keyPath !== "contentSha256"
      || !contentIndex.unique
      || contentIndex.multiEntry
      || mutationState.keyPath !== "key"
      || mutationState.autoIncrement
      || mutationState.indexNames.length !== 0) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "DATABASE_STATE_CORRUPT",
        "The isolated Browser workspace database indexes do not match schema version 1"
      );
    }
  } catch (cause) {
    if (cause instanceof ZiweiBrowserWorkspaceDraftError) throw cause;
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "The isolated Browser workspace database schema cannot be inspected",
      { cause }
    );
  }
}

async function readStoredSnapshot(database: IDBDatabase): Promise<StoredSnapshot> {
  try {
    const transaction = database.transaction([REVISION_STORE, MUTATION_STATE_STORE], "readonly");
    const done = transactionFinished(transaction);
    const [rawState, rawRecords] = await Promise.all([
      requestResult(transaction.objectStore(MUTATION_STATE_STORE).get(MUTATION_STATE_KEY)),
      requestResult(transaction.objectStore(REVISION_STORE).getAll())
    ]);
    await done;
    return validateStoredSnapshot(rawState, rawRecords);
  } catch (cause) {
    return throwNormalizedTransactionFailure(cause);
  }
}

function validateStoredSnapshot(rawState: unknown, rawRecords: unknown): StoredSnapshot {
  const parsedState = storedMutationStateSchema.safeParse(rawState);
  if (!parsedState.success) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "The isolated Browser workspace mutation state is missing or invalid"
    );
  }
  if (!Array.isArray(rawRecords)) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "The isolated Browser workspace revision snapshot is not an array"
    );
  }
  const records = rawRecords.map(parseStoredRevision);
  const revisionIds = new Set<string>();
  const contentDigests = new Set<string>();
  let totalRevisionBytes = 0;
  for (const record of records) {
    if (revisionIds.has(record.revisionId) || contentDigests.has(record.contentSha256)) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "DATABASE_STATE_CORRUPT",
        "The isolated Browser workspace contains duplicate immutable indexes"
      );
    }
    revisionIds.add(record.revisionId);
    contentDigests.add(record.contentSha256);
    if (record.byteLength !== record.canonicalBytes.byteLength
      || record.contentAddress !== `sha256:${record.contentSha256}`) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "STORED_INDEX_MISMATCH",
        "Stored Revision byte length or content address metadata is inconsistent"
      );
    }
    totalRevisionBytes += record.byteLength;
    if (!Number.isSafeInteger(totalRevisionBytes)) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "DATABASE_STATE_CORRUPT",
        "Stored Revision byte total exceeds the safe integer range"
      );
    }
  }
  if (parsedState.data.revisionCount !== records.length
    || parsedState.data.totalRevisionBytes !== totalRevisionBytes) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "Mutation state counts do not match the complete Revision store snapshot"
    );
  }
  return { state: parsedState.data, records };
}

function parseStoredRevision(candidate: unknown): StoredRevisionRecord {
  const parsed = storedRevisionRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "The isolated Browser workspace contains an invalid stored Revision record"
    );
  }
  return { ...parsed.data, canonicalBytes: new Uint8Array(parsed.data.canonicalBytes) };
}

async function verifyStoredRecord(
  record: StoredRevisionRecord,
  maxRevisionBytes: number
): Promise<ZiweiBrowserWorkspaceRevisionDraft> {
  const revision = await preflightZiweiBrowserWorkspaceRevisionJsonDraft(record.canonicalBytes, {
    maxBytes: maxRevisionBytes
  });
  if (record.revisionId !== revision.revisionId
    || record.studyId !== revision.studyId
    || record.parentRevisionId !== revision.parentRevisionId
    || record.contentSha256 !== revision.contentSha256
    || record.contentAddress !== revision.contentAddress
    || record.byteLength !== record.canonicalBytes.byteLength) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "STORED_INDEX_MISMATCH",
      "Stored indexes do not match the verified canonical Revision bytes"
    );
  }
  return revision;
}

async function verifyStoredLineage(
  records: readonly StoredRevisionRecord[],
  revision: ZiweiBrowserWorkspaceRevisionDraft,
  maxRevisionBytes: number
): Promise<void> {
  const visited = new Set<string>([revision.revisionId]);
  let cursor = revision;
  while (cursor.parentRevisionId !== null) {
    if (visited.has(cursor.parentRevisionId)) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "LINEAGE_CYCLE",
        "Stored Browser workspace lineage contains a cycle"
      );
    }
    visited.add(cursor.parentRevisionId);
    const parentRecord = records.find((item) => item.revisionId === cursor.parentRevisionId);
    if (!parentRecord) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PARENT_NOT_FOUND",
        "Stored Browser workspace lineage has a missing parent Revision"
      );
    }
    const parent = await verifyStoredRecord(parentRecord, maxRevisionBytes);
    if (parent.studyId !== revision.studyId) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PARENT_STUDY_MISMATCH",
        "Stored Browser workspace lineage crosses studyId"
      );
    }
    cursor = parent;
  }
}

function requireStoredParent(
  records: readonly StoredRevisionRecord[],
  revision: ZiweiBrowserWorkspaceRevisionDraft
): void {
  if (revision.parentRevisionId === null) return;
  const parent = records.find((item) => item.revisionId === revision.parentRevisionId);
  if (!parent) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "PARENT_NOT_FOUND",
      "The parent Browser workspace Revision must exist before its child"
    );
  }
  if (parent.studyId !== revision.studyId) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "PARENT_STUDY_MISMATCH",
      "The parent Browser workspace Revision belongs to another studyId"
    );
  }
}

function verifyCompleteLineage(
  revisions: readonly ZiweiBrowserWorkspaceRevisionDraft[]
): void {
  const byId = new Map(revisions.map((revision) => [revision.revisionId, revision] as const));
  for (const revision of revisions) {
    if (revision.parentRevisionId !== null) {
      const parent = byId.get(revision.parentRevisionId);
      if (!parent) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "PARENT_NOT_FOUND",
          `Complete backup omits parent Revision ${revision.parentRevisionId}`
        );
      }
      if (parent.studyId !== revision.studyId) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "PARENT_STUDY_MISMATCH",
          "Complete backup links a child to a parent from another studyId"
        );
      }
    }
    const visited = new Set<string>();
    let cursor: ZiweiBrowserWorkspaceRevisionDraft | undefined = revision;
    while (cursor !== undefined && cursor.parentRevisionId !== null) {
      if (visited.has(cursor.revisionId)) {
        throw new ZiweiBrowserWorkspaceDraftError(
          "LINEAGE_CYCLE",
          "Complete backup contains a cyclic Browser workspace lineage"
        );
      }
      visited.add(cursor.revisionId);
      cursor = byId.get(cursor.parentRevisionId);
    }
  }
}

function recordFor(
  revision: ZiweiBrowserWorkspaceRevisionDraft,
  canonicalBytes: Uint8Array
): StoredRevisionRecord {
  return {
    recordVersion: 1,
    revisionId: revision.revisionId,
    studyId: revision.studyId,
    parentRevisionId: revision.parentRevisionId,
    contentSha256: revision.contentSha256,
    contentAddress: revision.contentAddress,
    byteLength: canonicalBytes.byteLength,
    canonicalBytes: new Uint8Array(canonicalBytes)
  };
}

function sameStoredRecord(left: StoredRevisionRecord, right: StoredRevisionRecord): boolean {
  return left.recordVersion === right.recordVersion
    && left.revisionId === right.revisionId
    && left.studyId === right.studyId
    && left.parentRevisionId === right.parentRevisionId
    && left.contentSha256 === right.contentSha256
    && left.contentAddress === right.contentAddress
    && left.byteLength === right.byteLength
    && sameBytes(left.canonicalBytes, right.canonicalBytes);
}

function prepareBackupRecords(
  backup: ZiweiBrowserWorkspaceBackupDraft,
  maxRevisionBytes: number
): readonly StoredRevisionRecord[] {
  return backup.revisions.map((revision) => {
    const bytes = utf8Bytes(serializeZiweiBrowserWorkspaceRevisionDraft(revision));
    if (bytes.byteLength > maxRevisionBytes) {
      throw new ZiweiBrowserWorkspaceDraftError(
        "PAYLOAD_TOO_LARGE",
        `Backup Revision ${revision.revisionId} exceeds the per-Revision byte limit`
      );
    }
    return recordFor(revision, bytes);
  });
}

type BackupRecordClassification = Readonly<{
  newRecords: readonly StoredRevisionRecord[];
  alreadyPresentCount: number;
  conflictRevisionIds: readonly string[];
  conflictContentSha256: readonly string[];
}>;

function classifyBackupRecords(
  existing: readonly StoredRevisionRecord[],
  incoming: readonly StoredRevisionRecord[]
): BackupRecordClassification {
  const byRevisionId = new Map(existing.map((record) => [record.revisionId, record] as const));
  const byContent = new Map(existing.map((record) => [record.contentSha256, record] as const));
  const newRecords: StoredRevisionRecord[] = [];
  const conflictRevisionIds: string[] = [];
  const conflictContentSha256: string[] = [];
  let alreadyPresentCount = 0;
  for (const record of incoming) {
    const sameId = byRevisionId.get(record.revisionId);
    if (sameId !== undefined) {
      if (sameStoredRecord(sameId, record)) alreadyPresentCount += 1;
      else conflictRevisionIds.push(record.revisionId);
      continue;
    }
    const sameContent = byContent.get(record.contentSha256);
    if (sameContent !== undefined) {
      conflictContentSha256.push(record.contentSha256);
      continue;
    }
    newRecords.push(record);
  }
  return {
    newRecords,
    alreadyPresentCount,
    conflictRevisionIds,
    conflictContentSha256
  };
}

async function verifyStoredSnapshotContents(
  snapshot: StoredSnapshot,
  maxRevisionBytes: number
): Promise<readonly ZiweiBrowserWorkspaceRevisionDraft[]> {
  const revisions: ZiweiBrowserWorkspaceRevisionDraft[] = [];
  for (const record of snapshot.records) {
    revisions.push(await verifyStoredRecord(record, maxRevisionBytes));
  }
  verifyCompleteLineage(revisions);
  return revisions;
}

function parseCanonicalJsonBytes(
  raw: string | Uint8Array,
  maxBytes: number,
  label: "Revision" | "Backup"
): Readonly<{ candidate: unknown; canonicalJson: string }> {
  const bytes = typeof raw === "string" ? utf8Bytes(raw) : new Uint8Array(raw);
  if (bytes.byteLength > maxBytes) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "PAYLOAD_TOO_LARGE",
      `${label} JSON exceeds the ${maxBytes}-byte limit`
    );
  }
  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "INVALID_UTF8",
      `${label} import is not valid UTF-8`,
      { cause }
    );
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(json);
  } catch (cause) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "INVALID_JSON",
      `${label} import is not valid JSON`,
      { cause }
    );
  }
  let canonicalJson: string;
  try {
    canonicalJson = canonicalizeZiweiDigestJson(candidate);
  } catch (cause) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "SCHEMA_INVALID",
      errorMessage(cause, `${label} import is not canonical JSON`),
      { cause }
    );
  }
  if (json !== canonicalJson) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "NON_CANONICAL_BYTES",
      `${label} import must use exact canonical UTF-8 JSON bytes`
    );
  }
  return { candidate, canonicalJson };
}

function requireCapacity(
  revisionCount: number,
  totalBytes: number,
  maxRevisions: number,
  maxTotalBytes: number
): void {
  if (!Number.isSafeInteger(revisionCount)
    || !Number.isSafeInteger(totalBytes)
    || revisionCount > maxRevisions
    || totalBytes > maxTotalBytes) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "CAPACITY_EXCEEDED",
      `Isolated Browser workspace capacity exceeded (${revisionCount}/${maxRevisions} Revisions, ${totalBytes}/${maxTotalBytes} bytes)`
    );
  }
}

function requireExpectedEpoch(state: StoredMutationState, expectedEpoch: number): void {
  if (state.epoch !== expectedEpoch) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "EPOCH_CONFLICT",
      `Mutation epoch changed: expected ${expectedEpoch}, actual ${state.epoch}`
    );
  }
}

function publicMutationState(state: StoredMutationState): ZiweiBrowserWorkspaceMutationStateDraft {
  return {
    epoch: state.epoch,
    revisionCount: state.revisionCount,
    totalRevisionBytes: state.totalRevisionBytes
  };
}

function summarizeRevision(
  revision: ZiweiBrowserWorkspaceRevisionDraft
): ZiweiBrowserWorkspaceRevisionSummaryDraft {
  const facts = revision.artifact.facts;
  return {
    studyId: revision.studyId,
    revisionId: revision.revisionId,
    parentRevisionId: revision.parentRevisionId,
    createdAt: revision.createdAt,
    title: revision.title,
    note: revision.note,
    contentSha256: revision.contentSha256,
    contentAddress: revision.contentAddress,
    browserArtifactSha256: revision.browserArtifactSha256,
    gregorianDate: facts.calendarFacts.gregorianDate,
    lunarDate: { ...facts.calendarFacts.lunarDate },
    palaceCount: facts.palaces.length,
    starCount: facts.palaces.reduce((total, palace) => total + palace.stars.length, 0)
  };
}

function incrementEpoch(current: number): number {
  if (!Number.isSafeInteger(current) || current >= Number.MAX_SAFE_INTEGER) {
    throw new ZiweiBrowserWorkspaceDraftError(
      "DATABASE_STATE_CORRUPT",
      "Mutation epoch cannot be advanced safely"
    );
  }
  return current + 1;
}

function epoch(value: number): number {
  const parsed = nonNegativeSafeIntegerSchema.safeParse(value);
  if (!parsed.success) throw new RangeError("expectedEpoch must be a non-negative safe integer");
  return parsed.data;
}

function positiveSafeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function throwNormalizedTransactionFailure(cause: unknown): never {
  if (cause instanceof ZiweiBrowserWorkspaceDraftError) throw cause;
  throw new ZiweiBrowserWorkspaceDraftError(
    "TRANSACTION_ABORTED",
    errorMessage(cause, "Browser workspace transaction failed"),
    { cause }
  );
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionFinished(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new DOMException(
      "IndexedDB transaction aborted",
      "AbortError"
    ));
    transaction.onerror = () => {
      // The following abort event is authoritative and carries the final error.
    };
  });
}

async function runReadWrite<T>(
  database: IDBDatabase,
  operation: (transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  const transaction = database.transaction([REVISION_STORE, MUTATION_STATE_STORE], "readwrite");
  const done = transactionFinished(transaction);
  try {
    const result = await operation(transaction);
    await done;
    return result;
  } catch (cause) {
    try {
      transaction.abort();
    } catch {
      // It may already have aborted or completed. `done` below observes that state.
    }
    await done.catch(() => undefined);
    if (cause instanceof ZiweiBrowserWorkspaceDraftError) throw cause;
    const failureName = cause instanceof Error ? cause.name : "";
    if (failureName === "QuotaExceededError") {
      throw new ZiweiBrowserWorkspaceDraftError(
        "CAPACITY_EXCEEDED",
        "The browser rejected the isolated workspace write because device quota is insufficient",
        { cause }
      );
    }
    if (failureName === "ConstraintError") {
      throw new ZiweiBrowserWorkspaceDraftError(
        "CONTENT_CONFLICT",
        "IndexedDB rejected a duplicate immutable Browser workspace index",
        { cause }
      );
    }
    throw new ZiweiBrowserWorkspaceDraftError(
      "TRANSACTION_ABORTED",
      errorMessage(cause, "Browser workspace transaction aborted"),
      { cause }
    );
  }
}
