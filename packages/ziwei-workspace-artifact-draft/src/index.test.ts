// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import { ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./iztro-adapter-bridge.ts";
import {
  MemoryZiweiWorkspaceRevisionByteStoreDraft,
  ZiweiWorkspaceDraftError,
  ZiweiWorkspaceRevisionRepositoryDraft,
  createZiweiWorkspaceRevisionDraft,
  serializeZiweiWorkspaceRevisionDraft,
  verifyZiweiWorkspaceRevisionDraft,
  type ZiweiWorkspaceCreatePersistenceResult,
  type ZiweiWorkspaceRevisionByteStoreDraft,
  type ZiweiWorkspaceRevisionCreateInputDraft,
  type ZiweiWorkspaceRevisionPersistence
} from "./index.ts";

const STUDY_ID = "00000000-0000-4000-8000-000000000001";
const ROOT_REVISION_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_REVISION_ID = "22222222-2222-4222-8222-222222222222";

let fixture: Awaited<ReturnType<typeof calculateIztro258EngineeringFixture>>;

beforeAll(async () => {
  fixture = await calculateIztro258EngineeringFixture({
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: "1995-08-18" },
    shichenIndex: 6,
    sexForCalculation: "male",
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: "12:00",
      timeZone: "Asia/Shanghai",
      location: {
        precision: "coordinates",
        label: "Shanghai",
        latitude: 31.2304,
        longitude: 121.4737
      }
    },
    birthSourceRef: "fixture.workspace.1995_08_18",
    sourceNote: "Fresh iztro engineering fixture for the isolated workspace slice; not expert truth."
  });
});

function createInput(
  revisionId = ROOT_REVISION_ID,
  parentRevisionId: string | null = null,
  overrides: Partial<ZiweiWorkspaceRevisionCreateInputDraft> = {}
): ZiweiWorkspaceRevisionCreateInputDraft {
  return {
    studyId: STUDY_ID,
    revisionId,
    parentRevisionId,
    createdAt: parentRevisionId === null
      ? "2026-08-10T08:00:00.000Z"
      : "2026-08-10T08:05:00.000Z",
    title: parentRevisionId === null ? "Ziwei engineering study root" : "Ziwei engineering study revision 2",
    note: "Content-addressed isolated draft Revision; no Bazi Case/Revision link.",
    fixture,
    ...overrides
  };
}

async function expectWorkspaceError(
  promise: Promise<unknown>,
  code: ZiweiWorkspaceDraftError["code"]
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected ${code}`);
  } catch (cause) {
    expect(cause).toBeInstanceOf(ZiweiWorkspaceDraftError);
    expect((cause as ZiweiWorkspaceDraftError).code).toBe(code);
  }
}

describe("isolated Ziwei workspace Revision slice", () => {
  it("saves a real Revision, reopens it, exports/imports it, and preserves a child lineage", async () => {
    const durablePort = new MemoryZiweiWorkspaceRevisionByteStoreDraft();
    const firstSession = new ZiweiWorkspaceRevisionRepositoryDraft(durablePort);
    const rootSaved = await firstSession.saveRevision(createInput());

    expect(rootSaved.status).toBe("created");
    expect(rootSaved.revision).toMatchObject({
      studyId: STUDY_ID,
      revisionId: ROOT_REVISION_ID,
      parentRevisionId: null,
      fixtureArtifactSha256: fixture.receipt.artifactSha256,
      boundary: {
        productionEligible: false,
        expertTruthClaimed: false,
        engineExecutionAuthenticated: false,
        baziCaseRevisionLinked: false,
        productionDatabaseIncluded: false,
        fullBackupIncluded: false
      }
    });
    expect(rootSaved.revision.contentAddress).toBe(`sha256:${rootSaved.revision.contentSha256}`);

    // A new Repository object over the same explicit draft port is the reopen boundary.
    const reopenedSession = new ZiweiWorkspaceRevisionRepositoryDraft(durablePort);
    const reopenedRoot = await reopenedSession.reopenRevision(ROOT_REVISION_ID);
    expect(reopenedRoot).toEqual(rootSaved.revision);
    expect(await reopenedSession.reopenContent(reopenedRoot.contentSha256)).toEqual(reopenedRoot);

    const childSaved = await reopenedSession.saveRevision(
      createInput(CHILD_REVISION_ID, ROOT_REVISION_ID)
    );
    expect(childSaved.status).toBe("created");
    expect(childSaved.revision).toMatchObject({
      studyId: STUDY_ID,
      revisionId: CHILD_REVISION_ID,
      parentRevisionId: ROOT_REVISION_ID
    });
    expect(await new ZiweiWorkspaceRevisionRepositoryDraft(durablePort)
      .reopenRevision(CHILD_REVISION_ID)).toEqual(childSaved.revision);

    const rootExport = await reopenedSession.exportRevision(ROOT_REVISION_ID);
    const childExport = await reopenedSession.exportRevision(CHILD_REVISION_ID);
    expect(rootExport.byteLength).toBe(rootExport.bytes.byteLength);
    expect(new TextDecoder().decode(rootExport.bytes)).toBe(rootExport.json);
    expect(rootExport.json).toBe(serializeZiweiWorkspaceRevisionDraft(rootSaved.revision));

    const importedPort = new MemoryZiweiWorkspaceRevisionByteStoreDraft();
    const importedSession = new ZiweiWorkspaceRevisionRepositoryDraft(importedPort);
    await expectWorkspaceError(importedSession.importRevision(childExport.bytes), "PARENT_NOT_FOUND");
    expect((await importedSession.importRevision(rootExport.bytes)).status).toBe("created");
    expect((await importedSession.importRevision(rootExport.bytes)).status).toBe("already_present");
    expect((await importedSession.importRevision(childExport.bytes)).status).toBe("created");
    expect(await new ZiweiWorkspaceRevisionRepositoryDraft(importedPort)
      .reopenRevision(CHILD_REVISION_ID)).toEqual(childSaved.revision);
  });

  it("fails closed on changed content, non-canonical bytes, oversized input and missing parents", async () => {
    const root = await createZiweiWorkspaceRevisionDraft(createInput());
    const canonical = serializeZiweiWorkspaceRevisionDraft(root);
    const changed = JSON.parse(canonical) as Record<string, unknown>;
    changed.title = "Changed without rebinding the digest";

    const tamperedVerification = await verifyZiweiWorkspaceRevisionDraft(changed);
    expect(tamperedVerification).toMatchObject({ success: false, reason: "digest_mismatch" });
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(new MemoryZiweiWorkspaceRevisionByteStoreDraft())
        .importRevision(JSON.stringify(changed)),
      "DIGEST_MISMATCH"
    );
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(new MemoryZiweiWorkspaceRevisionByteStoreDraft())
        .importRevision(JSON.stringify(root, null, 2)),
      "NON_CANONICAL_BYTES"
    );
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(new MemoryZiweiWorkspaceRevisionByteStoreDraft())
        .importRevision(canonical, { maxBytes: 32 }),
      "PAYLOAD_TOO_LARGE"
    );
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(
        new MemoryZiweiWorkspaceRevisionByteStoreDraft(),
        { maxBytes: 32 }
      ).saveRevision(createInput()),
      "PAYLOAD_TOO_LARGE"
    );
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(new MemoryZiweiWorkspaceRevisionByteStoreDraft())
        .saveRevision(createInput(CHILD_REVISION_ID, ROOT_REVISION_ID)),
      "PARENT_NOT_FOUND"
    );
  });

  it("treats revisionId as immutable identity and binds the outer fixture SHA to the receipt", async () => {
    const repository = new ZiweiWorkspaceRevisionRepositoryDraft(
      new MemoryZiweiWorkspaceRevisionByteStoreDraft()
    );
    const first = await repository.saveRevision(createInput());
    expect((await repository.saveRevision(createInput())).status).toBe("already_present");
    await expectWorkspaceError(
      repository.saveRevision(createInput(ROOT_REVISION_ID, null, {
        title: "Different content under the same immutable revisionId"
      })),
      "REVISION_CONFLICT"
    );

    const forgedBinding = {
      ...first.revision,
      fixtureArtifactSha256: "0".repeat(64)
    };
    const verification = await verifyZiweiWorkspaceRevisionDraft(forgedBinding);
    expect(verification).toMatchObject({ success: false, reason: "schema_invalid" });
    expect(first.revision.fixtureArtifactSha256).toBe(first.revision.fixture.receipt.artifactSha256);
  });

  it("rejects corrupted bytes and storage indexes supplied by an injected Store", async () => {
    const durablePort = new MemoryZiweiWorkspaceRevisionByteStoreDraft();
    const repository = new ZiweiWorkspaceRevisionRepositoryDraft(durablePort);
    await repository.saveRevision(createInput());
    const stored = await durablePort.readRevision(ROOT_REVISION_ID);
    expect(stored).not.toBeNull();
    const validStored = stored as ZiweiWorkspaceRevisionPersistence;

    const tampered = JSON.parse(new TextDecoder().decode(validStored.bytes)) as Record<string, unknown>;
    tampered.note = "Storage bytes changed after the atomic create";
    const corruptedBytes = new TextEncoder().encode(JSON.stringify(tampered));
    const byteCorruptingStore: ZiweiWorkspaceRevisionByteStoreDraft = {
      createRevision: async (): Promise<ZiweiWorkspaceCreatePersistenceResult> => ({ status: "created" }),
      readRevision: async () => ({ ...validStored, bytes: corruptedBytes }),
      readContent: async () => ({ ...validStored, bytes: corruptedBytes })
    };
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(byteCorruptingStore)
        .reopenRevision(ROOT_REVISION_ID),
      "DIGEST_MISMATCH"
    );

    const indexCorruptingStore: ZiweiWorkspaceRevisionByteStoreDraft = {
      createRevision: async (): Promise<ZiweiWorkspaceCreatePersistenceResult> => ({ status: "created" }),
      readRevision: async () => ({
        ...validStored,
        revisionId: CHILD_REVISION_ID
      }),
      readContent: async () => ({
        ...validStored,
        contentSha256: "0".repeat(64)
      })
    };
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(indexCorruptingStore)
        .reopenRevision(ROOT_REVISION_ID),
      "STORED_INDEX_MISMATCH"
    );
    await expectWorkspaceError(
      new ZiweiWorkspaceRevisionRepositoryDraft(indexCorruptingStore)
        .reopenContent(validStored.contentSha256),
      "STORED_INDEX_MISMATCH"
    );
  });
});
