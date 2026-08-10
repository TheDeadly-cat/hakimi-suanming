import { z } from "zod";
import {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  canonicalizeZiweiDigestJson,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft,
  ziweiNatalFixtureDraftSchema,
  type ZiweiNatalFixtureDraft
} from "./contract-bridge.ts";

export const ZIWEI_WORKSPACE_ARTIFACT_DRAFT_VERSION = "0.1.0" as const;
export const ZIWEI_WORKSPACE_ARTIFACT_FORMAT = "hakimi-ziwei-workspace/0.1-draft" as const;
export const ZIWEI_WORKSPACE_ARTIFACT_MIME =
  "application/vnd.hakimi.ziwei-workspace-draft+json" as const;
export const ZIWEI_WORKSPACE_VERIFICATION_SCOPE =
  "structure_and_recomputed_unkeyed_digest_integrity" as const;
export const DEFAULT_MAX_ZIWEI_WORKSPACE_JSON_BYTES = 4 * 1024 * 1024;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const contentAddressSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const immutableIdSchema = z.string().uuid();

export const ziweiWorkspaceBoundaryDraftSchema = z.strictObject({
  isolation: z.literal("isolated_draft_store_only"),
  productionEligible: z.literal(false),
  expertTruthClaimed: z.literal(false),
  engineExecutionAuthenticated: z.literal(false),
  baziCaseRevisionLinked: z.literal(false),
  productionDatabaseIncluded: z.literal(false),
  fullBackupIncluded: z.literal(false)
});

export const ziweiWorkspaceRevisionDraftSchema = z
  .strictObject({
    format: z.literal(ZIWEI_WORKSPACE_ARTIFACT_FORMAT),
    formatVersion: z.literal(ZIWEI_WORKSPACE_ARTIFACT_DRAFT_VERSION),
    contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
    artifactKind: z.literal("ziwei_workspace_natal_revision"),
    studyId: immutableIdSchema,
    revisionId: immutableIdSchema,
    parentRevisionId: immutableIdSchema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
    title: z.string().trim().min(1).max(160),
    note: z.string().trim().max(1_000),
    fixtureArtifactSha256: sha256Schema,
    fixture: ziweiNatalFixtureDraftSchema,
    boundary: ziweiWorkspaceBoundaryDraftSchema,
    digestAlgorithm: z.literal(ZIWEI_DIGEST_ALGORITHM),
    verificationScope: z.literal(ZIWEI_WORKSPACE_VERIFICATION_SCOPE),
    contentSha256: sha256Schema,
    contentAddress: contentAddressSchema
  })
  .superRefine((value, context) => {
    if (value.parentRevisionId === value.revisionId) {
      context.addIssue({
        code: "custom",
        path: ["parentRevisionId"],
        message: "Revision cannot name itself as its parent"
      });
    }
    if (value.fixtureArtifactSha256 !== value.fixture.receipt.artifactSha256) {
      context.addIssue({
        code: "custom",
        path: ["fixtureArtifactSha256"],
        message: "fixtureArtifactSha256 must bind the embedded fixture receipt"
      });
    }
    if (value.contentAddress !== `sha256:${value.contentSha256}`) {
      context.addIssue({
        code: "custom",
        path: ["contentAddress"],
        message: "Content address must be derived from contentSha256"
      });
    }
  });

export const ziweiWorkspaceRevisionCreateInputDraftSchema = z.strictObject({
  studyId: immutableIdSchema,
  revisionId: immutableIdSchema,
  parentRevisionId: immutableIdSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }),
  title: z.string().trim().min(1).max(160),
  note: z.string().trim().max(1_000),
  fixture: ziweiNatalFixtureDraftSchema
});

export type ZiweiWorkspaceRevisionDraft = z.infer<typeof ziweiWorkspaceRevisionDraftSchema>;
export type ZiweiWorkspaceRevisionCreateInputDraft = z.input<
  typeof ziweiWorkspaceRevisionCreateInputDraftSchema
>;

export type ZiweiWorkspaceRevisionDigestMismatch = Readonly<{
  fieldPath: "contentSha256" | "contentAddress";
  expected: string;
  actual: string;
}>;

export type ZiweiWorkspaceRevisionVerificationResult =
  | Readonly<{
      success: true;
      data: ZiweiWorkspaceRevisionDraft;
      contentSha256: string;
      verificationScope: typeof ZIWEI_WORKSPACE_VERIFICATION_SCOPE;
    }>
  | Readonly<{
      success: false;
      reason:
        | "schema_invalid"
        | "schema_normalized_input"
        | "fixture_invalid"
        | "digest_calculation_failed"
        | "digest_mismatch";
      message: string;
      mismatches?: readonly ZiweiWorkspaceRevisionDigestMismatch[];
    }>;

export type ZiweiWorkspaceRevisionPersistence = Readonly<{
  studyId: string;
  revisionId: string;
  parentRevisionId: string | null;
  contentSha256: string;
  bytes: Uint8Array;
}>;

export type ZiweiWorkspaceCreatePersistenceResult =
  | Readonly<{ status: "created" }>
  | Readonly<{ status: "already_present" }>
  | Readonly<{ status: "revision_conflict" }>
  | Readonly<{ status: "content_conflict" }>
  | Readonly<{ status: "parent_not_found" }>
  | Readonly<{ status: "parent_study_mismatch" }>;

/**
 * The create operation must atomically enforce revision ID, content-address and
 * parent relationship uniqueness. No update/delete operation is exposed by the
 * draft port: a changed study is a new immutable Revision.
 */
export interface ZiweiWorkspaceRevisionByteStoreDraft {
  createRevision(
    revision: ZiweiWorkspaceRevisionPersistence
  ): Promise<ZiweiWorkspaceCreatePersistenceResult>;
  readRevision(revisionId: string): Promise<ZiweiWorkspaceRevisionPersistence | null>;
  readContent(contentSha256: string): Promise<ZiweiWorkspaceRevisionPersistence | null>;
}

export type ZiweiWorkspaceRepositorySaveResult = Readonly<{
  status: "created" | "already_present";
  revision: ZiweiWorkspaceRevisionDraft;
}>;

export type ZiweiWorkspaceRevisionExportDraft = Readonly<{
  fileName: string;
  mimeType: typeof ZIWEI_WORKSPACE_ARTIFACT_MIME;
  byteLength: number;
  contentSha256: string;
  contentAddress: string;
  bytes: Uint8Array;
  json: string;
}>;

export type ZiweiWorkspaceDraftErrorCode =
  | "INVALID_UTF8"
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE"
  | "NON_CANONICAL_BYTES"
  | "SCHEMA_INVALID"
  | "FIXTURE_INVALID"
  | "DIGEST_MISMATCH"
  | "REVISION_CONFLICT"
  | "CONTENT_CONFLICT"
  | "PARENT_NOT_FOUND"
  | "PARENT_STUDY_MISMATCH"
  | "REVISION_NOT_FOUND"
  | "CONTENT_NOT_FOUND"
  | "STORED_INDEX_MISMATCH";

export class ZiweiWorkspaceDraftError extends Error {
  readonly code: ZiweiWorkspaceDraftErrorCode;

  constructor(
    code: ZiweiWorkspaceDraftErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ZiweiWorkspaceDraftError";
    this.code = code;
  }
}

const ZIWEI_WORKSPACE_BOUNDARY = Object.freeze({
  isolation: "isolated_draft_store_only",
  productionEligible: false,
  expertTruthClaimed: false,
  engineExecutionAuthenticated: false,
  baziCaseRevisionLinked: false,
  productionDatabaseIncluded: false,
  fullBackupIncluded: false
} as const);

export function projectZiweiWorkspaceRevisionForDigest(
  revision: ZiweiWorkspaceRevisionDraft
): Omit<ZiweiWorkspaceRevisionDraft, "contentSha256" | "contentAddress"> {
  const {
    contentSha256: _excludedDigest,
    contentAddress: _excludedAddress,
    ...projection
  } = revision;
  return projection;
}

export async function calculateZiweiWorkspaceRevisionContentSha256Draft(
  revision: ZiweiWorkspaceRevisionDraft
): Promise<string> {
  return sha256ZiweiCanonicalJson(projectZiweiWorkspaceRevisionForDigest(revision));
}

/**
 * Verifies structure, canonical value preservation, the embedded fixture's
 * unkeyed digests and this envelope's content digest. It deliberately does not
 * authenticate who created the file or prove that a historical engine Worker ran.
 */
export async function verifyZiweiWorkspaceRevisionDraft(
  candidate: unknown
): Promise<ZiweiWorkspaceRevisionVerificationResult> {
  const parsed = ziweiWorkspaceRevisionDraftSchema.safeParse(candidate);
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
        message: "Raw workspace value changed during strict Schema normalization"
      };
    }
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: cause instanceof Error ? cause.message : "Workspace value is not canonical JSON"
    };
  }

  const fixtureVerification = await verifyZiweiNatalFixtureDraft(parsed.data.fixture);
  if (!fixtureVerification.success) {
    return {
      success: false,
      reason: "fixture_invalid",
      message: `Embedded Ziwei fixture failed its contract gate: ${fixtureVerification.reason}`
    };
  }

  let contentSha256: string;
  try {
    contentSha256 = await calculateZiweiWorkspaceRevisionContentSha256Draft(parsed.data);
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: cause instanceof Error ? cause.message : "Workspace content digest calculation failed"
    };
  }

  const mismatches: ZiweiWorkspaceRevisionDigestMismatch[] = [];
  if (parsed.data.contentSha256 !== contentSha256) {
    mismatches.push({
      fieldPath: "contentSha256",
      expected: contentSha256,
      actual: parsed.data.contentSha256
    });
  }
  const expectedAddress = `sha256:${contentSha256}`;
  if (parsed.data.contentAddress !== expectedAddress) {
    mismatches.push({
      fieldPath: "contentAddress",
      expected: expectedAddress,
      actual: parsed.data.contentAddress
    });
  }
  if (mismatches.length > 0) {
    return {
      success: false,
      reason: "digest_mismatch",
      message: "Workspace content address does not match its canonical content",
      mismatches
    };
  }

  return {
    success: true,
    data: parsed.data,
    contentSha256,
    verificationScope: ZIWEI_WORKSPACE_VERIFICATION_SCOPE
  };
}

export async function createZiweiWorkspaceRevisionDraft(
  input: ZiweiWorkspaceRevisionCreateInputDraft
): Promise<ZiweiWorkspaceRevisionDraft> {
  const normalized = ziweiWorkspaceRevisionCreateInputDraftSchema.parse(input);
  if (normalized.parentRevisionId === normalized.revisionId) {
    throw new ZiweiWorkspaceDraftError(
      "SCHEMA_INVALID",
      "Revision cannot name itself as its parent"
    );
  }
  const fixtureVerification = await verifyZiweiNatalFixtureDraft(normalized.fixture);
  if (!fixtureVerification.success) {
    throw new ZiweiWorkspaceDraftError(
      "FIXTURE_INVALID",
      `Ziwei fixture failed its contract gate: ${fixtureVerification.reason}`
    );
  }

  const provisional = ziweiWorkspaceRevisionDraftSchema.parse({
    format: ZIWEI_WORKSPACE_ARTIFACT_FORMAT,
    formatVersion: ZIWEI_WORKSPACE_ARTIFACT_DRAFT_VERSION,
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    artifactKind: "ziwei_workspace_natal_revision",
    studyId: normalized.studyId,
    revisionId: normalized.revisionId,
    parentRevisionId: normalized.parentRevisionId,
    createdAt: normalized.createdAt,
    title: normalized.title,
    note: normalized.note,
    fixtureArtifactSha256: normalized.fixture.receipt.artifactSha256,
    fixture: normalized.fixture,
    boundary: ZIWEI_WORKSPACE_BOUNDARY,
    digestAlgorithm: ZIWEI_DIGEST_ALGORITHM,
    verificationScope: ZIWEI_WORKSPACE_VERIFICATION_SCOPE,
    contentSha256: "0".repeat(64),
    contentAddress: `sha256:${"0".repeat(64)}`
  });
  const contentSha256 = await calculateZiweiWorkspaceRevisionContentSha256Draft(provisional);
  const revision = ziweiWorkspaceRevisionDraftSchema.parse({
    ...provisional,
    contentSha256,
    contentAddress: `sha256:${contentSha256}`
  });
  const verification = await verifyZiweiWorkspaceRevisionDraft(revision);
  if (!verification.success) {
    throw new ZiweiWorkspaceDraftError(
      verification.reason === "fixture_invalid" ? "FIXTURE_INVALID" : "DIGEST_MISMATCH",
      verification.message
    );
  }
  return verification.data;
}

export function serializeZiweiWorkspaceRevisionDraft(
  revision: ZiweiWorkspaceRevisionDraft
): string {
  return canonicalizeZiweiDigestJson(ziweiWorkspaceRevisionDraftSchema.parse(revision));
}

function immutableBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

function clonePersistence(
  revision: ZiweiWorkspaceRevisionPersistence
): ZiweiWorkspaceRevisionPersistence {
  return {
    ...revision,
    bytes: immutableBytes(revision.bytes)
  };
}

/**
 * Test/demo-only durable-port implementation. Passing the same instance to a
 * newly constructed Repository simulates closing and reopening the repository
 * without introducing IndexedDB, localStorage or the Bazi database.
 */
export class MemoryZiweiWorkspaceRevisionByteStoreDraft
implements ZiweiWorkspaceRevisionByteStoreDraft {
  readonly #byRevisionId = new Map<string, ZiweiWorkspaceRevisionPersistence>();
  readonly #byContentSha256 = new Map<string, ZiweiWorkspaceRevisionPersistence>();

  async createRevision(
    revision: ZiweiWorkspaceRevisionPersistence
  ): Promise<ZiweiWorkspaceCreatePersistenceResult> {
    const existingRevision = this.#byRevisionId.get(revision.revisionId);
    if (existingRevision) {
      return sameBytes(existingRevision.bytes, revision.bytes)
        ? { status: "already_present" }
        : { status: "revision_conflict" };
    }
    const existingContent = this.#byContentSha256.get(revision.contentSha256);
    if (existingContent) {
      return sameBytes(existingContent.bytes, revision.bytes)
        ? { status: "already_present" }
        : { status: "content_conflict" };
    }
    if (revision.parentRevisionId !== null) {
      const parent = this.#byRevisionId.get(revision.parentRevisionId);
      if (!parent) return { status: "parent_not_found" };
      if (parent.studyId !== revision.studyId) return { status: "parent_study_mismatch" };
    }
    const stored = clonePersistence(revision);
    this.#byRevisionId.set(stored.revisionId, stored);
    this.#byContentSha256.set(stored.contentSha256, stored);
    return { status: "created" };
  }

  async readRevision(revisionId: string): Promise<ZiweiWorkspaceRevisionPersistence | null> {
    const revision = this.#byRevisionId.get(revisionId);
    return revision ? clonePersistence(revision) : null;
  }

  async readContent(contentSha256: string): Promise<ZiweiWorkspaceRevisionPersistence | null> {
    const revision = this.#byContentSha256.get(contentSha256);
    return revision ? clonePersistence(revision) : null;
  }
}

function persistenceFor(
  revision: ZiweiWorkspaceRevisionDraft,
  bytes: Uint8Array
): ZiweiWorkspaceRevisionPersistence {
  return {
    studyId: revision.studyId,
    revisionId: revision.revisionId,
    parentRevisionId: revision.parentRevisionId,
    contentSha256: revision.contentSha256,
    bytes: immutableBytes(bytes)
  };
}

function persistenceFailure(result: ZiweiWorkspaceCreatePersistenceResult): never {
  switch (result.status) {
    case "revision_conflict":
      throw new ZiweiWorkspaceDraftError(
        "REVISION_CONFLICT",
        "The immutable revisionId already addresses different bytes"
      );
    case "content_conflict":
      throw new ZiweiWorkspaceDraftError(
        "CONTENT_CONFLICT",
        "The content SHA-256 already addresses different bytes"
      );
    case "parent_not_found":
      throw new ZiweiWorkspaceDraftError(
        "PARENT_NOT_FOUND",
        "The parent Revision must exist before a child Revision is saved"
      );
    case "parent_study_mismatch":
      throw new ZiweiWorkspaceDraftError(
        "PARENT_STUDY_MISMATCH",
        "The parent Revision belongs to another studyId"
      );
    case "created":
    case "already_present":
      throw new Error("Persistence success was routed to the failure mapper");
  }
}

export async function preflightZiweiWorkspaceRevisionJsonDraft(
  raw: string | Uint8Array,
  options: Readonly<{ maxBytes?: number }> = {}
): Promise<ZiweiWorkspaceRevisionDraft> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_ZIWEI_WORKSPACE_JSON_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("maxBytes must be a positive safe integer");
  }
  const bytes = typeof raw === "string" ? new TextEncoder().encode(raw) : immutableBytes(raw);
  if (bytes.byteLength > maxBytes) {
    throw new ZiweiWorkspaceDraftError(
      "PAYLOAD_TOO_LARGE",
      `Workspace JSON exceeds the ${maxBytes}-byte import limit`
    );
  }

  let json: string;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ZiweiWorkspaceDraftError("INVALID_UTF8", "Workspace import is not valid UTF-8", {
      cause
    });
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(json);
  } catch (cause) {
    throw new ZiweiWorkspaceDraftError("INVALID_JSON", "Workspace import is not valid JSON", {
      cause
    });
  }

  let canonicalJson: string;
  try {
    canonicalJson = canonicalizeZiweiDigestJson(candidate);
  } catch (cause) {
    throw new ZiweiWorkspaceDraftError(
      "SCHEMA_INVALID",
      cause instanceof Error ? cause.message : "Workspace import is not canonical JSON",
      { cause }
    );
  }
  if (json !== canonicalJson) {
    throw new ZiweiWorkspaceDraftError(
      "NON_CANONICAL_BYTES",
      "Workspace import must use the exact canonical UTF-8 JSON serialization"
    );
  }

  const verification = await verifyZiweiWorkspaceRevisionDraft(candidate);
  if (!verification.success) {
    const code = verification.reason === "fixture_invalid"
      ? "FIXTURE_INVALID"
      : verification.reason === "digest_mismatch"
        ? "DIGEST_MISMATCH"
        : "SCHEMA_INVALID";
    throw new ZiweiWorkspaceDraftError(code, verification.message);
  }
  return verification.data;
}

export class ZiweiWorkspaceRevisionRepositoryDraft {
  readonly store: ZiweiWorkspaceRevisionByteStoreDraft;
  readonly maxBytes: number;

  constructor(
    store: ZiweiWorkspaceRevisionByteStoreDraft,
    options: Readonly<{ maxBytes?: number }> = {}
  ) {
    this.store = store;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_ZIWEI_WORKSPACE_JSON_BYTES;
    if (!Number.isSafeInteger(this.maxBytes) || this.maxBytes <= 0) {
      throw new RangeError("maxBytes must be a positive safe integer");
    }
  }

  async saveRevision(
    input: ZiweiWorkspaceRevisionCreateInputDraft
  ): Promise<ZiweiWorkspaceRepositorySaveResult> {
    const revision = await createZiweiWorkspaceRevisionDraft(input);
    return this.#persistVerifiedRevision(revision);
  }

  async reopenRevision(revisionId: string): Promise<ZiweiWorkspaceRevisionDraft> {
    const validRevisionId = immutableIdSchema.parse(revisionId);
    const stored = await this.store.readRevision(validRevisionId);
    if (!stored) {
      throw new ZiweiWorkspaceDraftError("REVISION_NOT_FOUND", `Revision ${validRevisionId} was not found`);
    }
    const revision = await this.#verifyStoredRevision(stored);
    if (revision.revisionId !== validRevisionId) {
      throw new ZiweiWorkspaceDraftError(
        "STORED_INDEX_MISMATCH",
        "Stored revision bytes do not match the revisionId index"
      );
    }
    await this.#verifyParentRelationship(revision);
    return revision;
  }

  async reopenContent(contentSha256: string): Promise<ZiweiWorkspaceRevisionDraft> {
    const validDigest = sha256Schema.parse(contentSha256);
    const stored = await this.store.readContent(validDigest);
    if (!stored) {
      throw new ZiweiWorkspaceDraftError("CONTENT_NOT_FOUND", `Content ${validDigest} was not found`);
    }
    const revision = await this.#verifyStoredRevision(stored);
    if (revision.contentSha256 !== validDigest) {
      throw new ZiweiWorkspaceDraftError(
        "STORED_INDEX_MISMATCH",
        "Stored revision bytes do not match the content digest index"
      );
    }
    await this.#verifyParentRelationship(revision);
    return revision;
  }

  async exportRevision(revisionId: string): Promise<ZiweiWorkspaceRevisionExportDraft> {
    const revision = await this.reopenRevision(revisionId);
    const json = serializeZiweiWorkspaceRevisionDraft(revision);
    const bytes = new TextEncoder().encode(json);
    return {
      fileName: `hakimi-ziwei-${revision.studyId}-${revision.revisionId}.json`,
      mimeType: ZIWEI_WORKSPACE_ARTIFACT_MIME,
      byteLength: bytes.byteLength,
      contentSha256: revision.contentSha256,
      contentAddress: revision.contentAddress,
      bytes,
      json
    };
  }

  async importRevision(
    raw: string | Uint8Array,
    options: Readonly<{ maxBytes?: number }> = {}
  ): Promise<ZiweiWorkspaceRepositorySaveResult> {
    const requestedMaxBytes = options.maxBytes ?? this.maxBytes;
    const revision = await preflightZiweiWorkspaceRevisionJsonDraft(raw, {
      maxBytes: Math.min(requestedMaxBytes, this.maxBytes)
    });
    return this.#persistVerifiedRevision(revision);
  }

  async #persistVerifiedRevision(
    revision: ZiweiWorkspaceRevisionDraft
  ): Promise<ZiweiWorkspaceRepositorySaveResult> {
    const json = serializeZiweiWorkspaceRevisionDraft(revision);
    const bytes = new TextEncoder().encode(json);
    if (bytes.byteLength > this.maxBytes) {
      throw new ZiweiWorkspaceDraftError(
        "PAYLOAD_TOO_LARGE",
        `Workspace Revision exceeds the ${this.maxBytes}-byte repository replay limit`
      );
    }
    const result = await this.store.createRevision(
      persistenceFor(revision, bytes)
    );
    if (result.status === "created" || result.status === "already_present") {
      return { status: result.status, revision };
    }
    return persistenceFailure(result);
  }

  async #verifyStoredRevision(
    stored: ZiweiWorkspaceRevisionPersistence
  ): Promise<ZiweiWorkspaceRevisionDraft> {
    const revision = await preflightZiweiWorkspaceRevisionJsonDraft(stored.bytes, {
      maxBytes: this.maxBytes
    });
    if (stored.studyId !== revision.studyId
      || stored.revisionId !== revision.revisionId
      || stored.parentRevisionId !== revision.parentRevisionId
      || stored.contentSha256 !== revision.contentSha256) {
      throw new ZiweiWorkspaceDraftError(
        "STORED_INDEX_MISMATCH",
        "Stored index metadata does not match the canonical Revision bytes"
      );
    }
    return revision;
  }

  async #verifyParentRelationship(revision: ZiweiWorkspaceRevisionDraft): Promise<void> {
    if (revision.parentRevisionId === null) return;
    const parent = await this.store.readRevision(revision.parentRevisionId);
    if (!parent) {
      throw new ZiweiWorkspaceDraftError(
        "PARENT_NOT_FOUND",
        "Stored child Revision has no parent Revision"
      );
    }
    const verifiedParent = await this.#verifyStoredRevision(parent);
    if (verifiedParent.studyId !== revision.studyId) {
      throw new ZiweiWorkspaceDraftError(
        "PARENT_STUDY_MISMATCH",
        "Stored parent Revision belongs to another studyId"
      );
    }
  }
}
