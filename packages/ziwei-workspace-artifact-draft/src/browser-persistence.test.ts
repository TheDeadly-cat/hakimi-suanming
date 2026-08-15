// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import {
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  calculateZiweiBrowserSourceGraphSha256,
  createZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserSourceIdentityDraft
} from "./browser-artifact-bridge.ts";
import {
  IndexedDbZiweiBrowserWorkspaceDraft,
  ZIWEI_BROWSER_WORKSPACE_BACKUP_FORMAT,
  ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME,
  ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION,
  ZiweiBrowserWorkspaceDraftError,
  calculateZiweiBrowserWorkspaceBackupSha256Draft,
  createZiweiBrowserWorkspaceRevisionDraft,
  serializeZiweiBrowserWorkspaceBackupDraft,
  serializeZiweiBrowserWorkspaceRevisionDraft,
  type ZiweiBrowserWorkspaceBackupDraft,
  type ZiweiBrowserWorkspaceRevisionCreateInputDraft
} from "./browser-persistence.ts";
import { ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./iztro-adapter-bridge.ts";

const STUDY_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_STUDY_ID = "10000000-0000-4000-8000-000000000002";
const ROOT_REVISION_ID = "20000000-0000-4000-8000-000000000001";
const CHILD_REVISION_ID = "20000000-0000-4000-8000-000000000002";
const OTHER_REVISION_ID = "20000000-0000-4000-8000-000000000003";
const MISSING_REVISION_ID = "20000000-0000-4000-8000-000000000099";

let browserArtifact: ZiweiBrowserEngineeringArtifactDraft;

beforeAll(async () => {
  const fixture = await calculateIztro258EngineeringFixture({
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: "1995-08-18" },
    shichenIndex: 6,
    sexForCalculation: "male",
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: null,
      timeZone: null,
      location: {
        precision: "unknown",
        label: "browser-persistence-test",
        latitude: null,
        longitude: null
      }
    },
    birthSourceRef: "local.browser.persistence.test",
    sourceNote: "Fresh isolated Browser persistence integration fixture; not expert truth."
  });
  const files = ZIWEI_BROWSER_SOURCE_PATHS.map((path, index) => ({
    path,
    sha256: (index + 1).toString(16).padStart(64, "0")
  }));
  const sourceProjection = {
    identityVersion: ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
    digestAlgorithm: ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
    files
  } as const;
  const browserSourceIdentity: ZiweiBrowserSourceIdentityDraft = {
    ...sourceProjection,
    browserSourceGraphSha256: await calculateZiweiBrowserSourceGraphSha256(sourceProjection),
    browserWorkerSourceSha256: files.find((entry) => entry.path.endsWith("browser-worker.ts"))!.sha256
  };
  browserArtifact = await createZiweiBrowserEngineeringArtifactDraft({
    input: fixture.input,
    ruleSnapshot: fixture.ruleSnapshot,
    facts: fixture.facts,
    requestId: "30000000-0000-4000-8000-000000000001",
    workerInstanceId: "30000000-0000-4000-8000-000000000002",
    startedAt: "2026-08-10T00:00:00.000Z",
    completedAt: "2026-08-10T00:00:00.010Z",
    browserSourceIdentity
  });
}, 30_000);

function freshFactory(): IDBFactory {
  const Factory = indexedDB.constructor as unknown as new () => IDBFactory;
  return new Factory();
}

function revisionInput(
  revisionId = ROOT_REVISION_ID,
  parentRevisionId: string | null = null,
  overrides: Partial<ZiweiBrowserWorkspaceRevisionCreateInputDraft> = {}
): ZiweiBrowserWorkspaceRevisionCreateInputDraft {
  return {
    studyId: STUDY_ID,
    revisionId,
    parentRevisionId,
    createdAt: parentRevisionId === null
      ? "2026-08-10T08:00:00.000Z"
      : "2026-08-10T08:05:00.000Z",
    title: parentRevisionId === null ? "紫微浏览器档案" : "紫微浏览器档案修订二",
    note: "独立 Browser 工件；不关联八字 Case/Revision。",
    artifact: browserArtifact,
    ...overrides
  };
}

async function expectWorkspaceError(
  promise: Promise<unknown>,
  code: ZiweiBrowserWorkspaceDraftError["code"]
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected ${code}`);
  } catch (cause) {
    expect(cause).toBeInstanceOf(ZiweiBrowserWorkspaceDraftError);
    expect((cause as ZiweiBrowserWorkspaceDraftError).code).toBe(code);
  }
}

async function corruptStoredRevisionBytes(
  factory: IDBFactory,
  revisionId: string
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(
      ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME,
      ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION
    );
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const transaction = database.transaction("revisions", "readwrite");
    const store = transaction.objectStore("revisions");
    const record = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = store.get(revisionId);
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });
    const bytes = new Uint8Array(record.canonicalBytes as Uint8Array);
    bytes[0] = 0x78;
    store.put({ ...record, canonicalBytes: bytes });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => undefined;
    });
  } finally {
    database.close();
  }
}

describe("isolated Ziwei Browser IndexedDB workspace", () => {
  it("saves canonical Browser artifacts, reopens them in a new repository, and imports an exact Revision", async () => {
    const factory = freshFactory();
    const firstSession = new IndexedDbZiweiBrowserWorkspaceDraft(factory);
    expect(await firstSession.getMutationState()).toEqual({
      epoch: 0,
      revisionCount: 0,
      totalRevisionBytes: 0
    });

    const saved = await firstSession.saveRevision(revisionInput(), 0);
    expect(saved.status).toBe("created");
    expect(saved.epoch).toBe(1);
    expect(saved.revision).toMatchObject({
      studyId: STUDY_ID,
      revisionId: ROOT_REVISION_ID,
      browserArtifactSha256: browserArtifact.digests.artifactSha256,
      boundary: {
        productionEligible: false,
        expertTruthClaimed: false,
        baziCaseRevisionLinked: false,
        productionDatabaseIncluded: false
      }
    });

    const reopenedSession = new IndexedDbZiweiBrowserWorkspaceDraft(factory);
    expect(await reopenedSession.reopenRevision(ROOT_REVISION_ID)).toEqual(saved.revision);
    expect(await reopenedSession.reopenContent(saved.revision.contentSha256)).toEqual(saved.revision);

    const exported = await reopenedSession.exportRevision(ROOT_REVISION_ID);
    expect(exported.byteLength).toBe(exported.bytes.byteLength);
    expect(new TextDecoder().decode(exported.bytes)).toBe(exported.json);
    expect(exported.json).toBe(serializeZiweiBrowserWorkspaceRevisionDraft(saved.revision));

    const importedRepository = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const imported = await importedRepository.importRevision(exported.bytes, 0);
    expect(imported.status).toBe("created");
    expect(imported.epoch).toBe(1);
    expect(await importedRepository.reopenRevision(ROOT_REVISION_ID)).toEqual(saved.revision);
  });

  it("enforces epoch CAS before idempotency and fails closed on immutable conflicts and bad parents", async () => {
    const repository = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const root = await repository.saveRevision(revisionInput(), 0);

    const replay = await repository.saveRevision(revisionInput(), 1);
    expect(replay).toMatchObject({ status: "already_present", epoch: 1 });
    expect((await repository.getMutationState()).epoch).toBe(1);
    await expectWorkspaceError(repository.saveRevision(revisionInput(), 0), "EPOCH_CONFLICT");

    await expectWorkspaceError(repository.saveRevision(revisionInput(ROOT_REVISION_ID, null, {
      title: "同一 revisionId 下的不同内容"
    }), 1), "REVISION_CONFLICT");
    expect(await repository.reopenRevision(ROOT_REVISION_ID)).toEqual(root.revision);
    expect((await repository.getMutationState()).epoch).toBe(1);

    await expectWorkspaceError(repository.saveRevision(
      revisionInput(CHILD_REVISION_ID, MISSING_REVISION_ID),
      1
    ), "PARENT_NOT_FOUND");
    await expectWorkspaceError(repository.saveRevision(
      revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID, { studyId: OTHER_STUDY_ID }),
      1
    ), "PARENT_STUDY_MISMATCH");

    const child = await repository.saveRevision(
      revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID),
      1
    );
    expect(child).toMatchObject({ status: "created", epoch: 2 });
  });

  it("serializes simultaneous tabs so exactly one create commits at the same expected epoch", async () => {
    const factory = freshFactory();
    const tabA = new IndexedDbZiweiBrowserWorkspaceDraft(factory);
    const tabB = new IndexedDbZiweiBrowserWorkspaceDraft(factory);
    const outcomes = await Promise.allSettled([
      tabA.saveRevision(revisionInput(), 0),
      tabB.saveRevision(revisionInput(OTHER_REVISION_ID, null, {
        title: "并发标签页的第二份根档案"
      }), 0)
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(ZiweiBrowserWorkspaceDraftError);
      expect((rejected.reason as ZiweiBrowserWorkspaceDraftError).code).toBe("EPOCH_CONFLICT");
    }
    expect(await tabA.getMutationState()).toMatchObject({ epoch: 1, revisionCount: 1 });
    expect(await tabA.listRecentRevisions()).toHaveLength(1);
  });

  it("returns only verified bounded recent summaries in a stable order", async () => {
    const repository = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    await repository.saveRevision(revisionInput(), 0);
    await repository.saveRevision(revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID), 1);

    const summaries = await repository.listRecentRevisions(1);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      studyId: STUDY_ID,
      revisionId: CHILD_REVISION_ID,
      parentRevisionId: ROOT_REVISION_ID,
      title: "紫微浏览器档案修订二",
      gregorianDate: "1995-08-18",
      palaceCount: 12,
      browserArtifactSha256: browserArtifact.digests.artifactSha256
    });
    expect(summaries[0]!.starCount).toBeGreaterThan(0);
    expect(Object.isFrozen(summaries)).toBe(false);
    await expect(repository.listRecentRevisions(0)).rejects.toBeInstanceOf(RangeError);
    await expect(repository.listRecentRevisions(101)).rejects.toBeInstanceOf(RangeError);
  });

  it("enforces per-Revision, record-count and total-byte capacity without advancing epoch", async () => {
    const canonicalRevision = await createZiweiBrowserWorkspaceRevisionDraft(revisionInput());
    const revisionBytes = new TextEncoder().encode(
      serializeZiweiBrowserWorkspaceRevisionDraft(canonicalRevision)
    ).byteLength;

    const tooSmall = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory(), {
      maxRevisionBytes: revisionBytes - 1
    });
    await expectWorkspaceError(tooSmall.saveRevision(revisionInput(), 0), "PAYLOAD_TOO_LARGE");
    expect((await tooSmall.getMutationState()).epoch).toBe(0);

    const oneRevisionOnly = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory(), {
      maxRevisionBytes: revisionBytes * 2,
      maxTotalBytes: revisionBytes * 3,
      maxRevisions: 1
    });
    await oneRevisionOnly.saveRevision(revisionInput(), 0);
    await expectWorkspaceError(oneRevisionOnly.saveRevision(
      revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID),
      1
    ), "CAPACITY_EXCEEDED");
    expect(await oneRevisionOnly.getMutationState()).toMatchObject({
      epoch: 1,
      revisionCount: 1
    });

    const totalBytesOnly = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory(), {
      maxRevisionBytes: revisionBytes * 2,
      maxTotalBytes: revisionBytes,
      maxRevisions: 10
    });
    await totalBytesOnly.saveRevision(revisionInput(), 0);
    await expectWorkspaceError(totalBytesOnly.saveRevision(
      revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID),
      1
    ), "CAPACITY_EXCEEDED");
    expect((await totalBytesOnly.getMutationState()).epoch).toBe(1);
  });

  it("reports restore capacity during read-only inspection and rejects the write with no partial state", async () => {
    const source = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const saved = await source.saveRevision(revisionInput(), 0);
    const backup = await source.exportFullBackup({ exportedAt: "2026-08-10T09:00:00.000Z" });
    const revisionBytes = new TextEncoder().encode(
      serializeZiweiBrowserWorkspaceRevisionDraft(saved.revision)
    ).byteLength;
    const target = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory(), {
      maxRevisionBytes: revisionBytes,
      maxTotalBytes: revisionBytes - 1
    });
    expect(await target.inspectFullBackupRestore(backup.bytes)).toMatchObject({
      targetEpoch: 0,
      newRevisionCount: 1,
      conflictCount: 0,
      projectedRevisionCount: 1,
      projectedTotalRevisionBytes: revisionBytes,
      capacityExceeded: true
    });
    await expectWorkspaceError(target.restoreFullBackup(backup.bytes, 0), "CAPACITY_EXCEEDED");
    expect(await target.getMutationState()).toEqual({
      epoch: 0,
      revisionCount: 0,
      totalRevisionBytes: 0
    });
  });

  it("exports every Revision and atomically restores an empty database with idempotent exact replay", async () => {
    const source = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const root = await source.saveRevision(revisionInput(), 0);
    const child = await source.saveRevision(
      revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID),
      1
    );
    const exported = await source.exportFullBackup({ exportedAt: "2026-08-10T09:00:00.000Z" });
    const parsed = JSON.parse(exported.json) as ZiweiBrowserWorkspaceBackupDraft;
    expect(parsed).toMatchObject({
      format: ZIWEI_BROWSER_WORKSPACE_BACKUP_FORMAT,
      sourceDatabase: {
        name: ZIWEI_BROWSER_WORKSPACE_DATABASE_NAME,
        version: ZIWEI_BROWSER_WORKSPACE_DATABASE_VERSION,
        epoch: 2
      },
      revisionCount: 2,
      boundary: {
        includesEveryRevision: true,
        baziDatabaseIncluded: false,
        productionDatabaseIncluded: false
      }
    });
    expect(new TextDecoder().decode(exported.bytes)).toBe(exported.json);
    expect(exported.contentAddress).toBe(`sha256:${exported.contentSha256}`);

    const restored = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    expect(await restored.inspectFullBackupRestore(exported.bytes)).toMatchObject({
      backupContentSha256: exported.contentSha256,
      targetEpoch: 0,
      backupRevisionCount: 2,
      newRevisionCount: 2,
      alreadyPresentCount: 0,
      conflictCount: 0,
      conflictRevisionIds: [],
      conflictContentSha256: [],
      projectedRevisionCount: 2,
      capacityExceeded: false
    });
    expect(await restored.restoreFullBackup(exported.bytes, 0)).toEqual({
      status: "restored",
      revisionCount: 2,
      addedRevisionCount: 2,
      alreadyPresentCount: 0,
      epoch: 1
    });
    expect(await restored.reopenRevision(ROOT_REVISION_ID)).toEqual(root.revision);
    expect(await restored.reopenRevision(CHILD_REVISION_ID)).toEqual(child.revision);
    expect(await restored.restoreFullBackup(exported.bytes, 1)).toEqual({
      status: "already_present",
      revisionCount: 2,
      addedRevisionCount: 0,
      alreadyPresentCount: 2,
      epoch: 1
    });
    await expectWorkspaceError(restored.restoreFullBackup(exported.bytes, 0), "EPOCH_CONFLICT");
  });

  it("rejects non-canonical, oversized, tampered and lineage-incomplete backups before mutation", async () => {
    const source = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    await source.saveRevision(revisionInput(), 0);
    await source.saveRevision(revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID), 1);
    const exported = await source.exportFullBackup({ exportedAt: "2026-08-10T09:00:00.000Z" });
    const target = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());

    await expectWorkspaceError(
      target.restoreFullBackup(JSON.stringify(JSON.parse(exported.json), null, 2), 0),
      "NON_CANONICAL_BYTES"
    );
    await expectWorkspaceError(
      target.restoreFullBackup(exported.bytes, 0, { maxBytes: 32 }),
      "PAYLOAD_TOO_LARGE"
    );

    const changed = JSON.parse(exported.json) as ZiweiBrowserWorkspaceBackupDraft;
    changed.revisions[0]!.title = "未重绑摘要的篡改标题";
    await expectWorkspaceError(target.restoreFullBackup(JSON.stringify(changed), 0), "DIGEST_MISMATCH");
    expect(await target.getMutationState()).toEqual({ epoch: 0, revisionCount: 0, totalRevisionBytes: 0 });

    const full = JSON.parse(exported.json) as ZiweiBrowserWorkspaceBackupDraft;
    const child = full.revisions.find((revision) => revision.revisionId === CHILD_REVISION_ID)!;
    const childBytes = new TextEncoder().encode(
      serializeZiweiBrowserWorkspaceRevisionDraft(child)
    ).byteLength;
    const orphanProvisional: ZiweiBrowserWorkspaceBackupDraft = {
      ...full,
      revisionCount: 1,
      totalRevisionBytes: childBytes,
      revisions: [child],
      contentSha256: "0".repeat(64),
      contentAddress: `sha256:${"0".repeat(64)}`
    };
    const orphanSha = await calculateZiweiBrowserWorkspaceBackupSha256Draft(orphanProvisional);
    const orphan: ZiweiBrowserWorkspaceBackupDraft = {
      ...orphanProvisional,
      contentSha256: orphanSha,
      contentAddress: `sha256:${orphanSha}`
    };
    await expectWorkspaceError(
      target.restoreFullBackup(serializeZiweiBrowserWorkspaceBackupDraft(orphan), 0),
      "PARENT_NOT_FOUND"
    );
    expect((await target.getMutationState()).epoch).toBe(0);
  });

  it("merges only new records and keeps conflicting full restore atomic", async () => {
    const source = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    await source.saveRevision(revisionInput(), 0);
    await source.saveRevision(revisionInput(CHILD_REVISION_ID, ROOT_REVISION_ID), 1);
    const backup = await source.exportFullBackup({ exportedAt: "2026-08-10T09:00:00.000Z" });

    const mergeTarget = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const extra = await mergeTarget.saveRevision(revisionInput(OTHER_REVISION_ID, null, {
      studyId: OTHER_STUDY_ID,
      title: "目标库原有独立档案"
    }), 0);
    await mergeTarget.saveRevision(revisionInput(), 1);
    expect(await mergeTarget.inspectFullBackupRestore(backup.bytes)).toMatchObject({
      targetEpoch: 2,
      newRevisionCount: 1,
      alreadyPresentCount: 1,
      conflictRevisionIds: []
    });
    expect(await mergeTarget.restoreFullBackup(backup.bytes, 2)).toMatchObject({
      status: "restored",
      addedRevisionCount: 1,
      alreadyPresentCount: 1,
      epoch: 3
    });
    expect(await mergeTarget.reopenRevision(OTHER_REVISION_ID)).toEqual(extra.revision);
    expect(await mergeTarget.reopenRevision(ROOT_REVISION_ID)).toBeDefined();

    const conflictTarget = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    const existing = await conflictTarget.saveRevision(revisionInput(ROOT_REVISION_ID, null, {
      title: "同一身份下的目标库不同内容"
    }), 0);
    const inspection = await conflictTarget.inspectFullBackupRestore(backup.bytes);
    expect(inspection).toMatchObject({
      targetEpoch: 1,
      newRevisionCount: 1,
      alreadyPresentCount: 0,
      conflictCount: 1,
      conflictRevisionIds: [ROOT_REVISION_ID]
    });
    await expectWorkspaceError(
      conflictTarget.restoreFullBackup(backup.bytes, 1),
      "BACKUP_CONFLICT"
    );
    expect(await conflictTarget.getMutationState()).toMatchObject({ epoch: 1, revisionCount: 1 });
    expect(await conflictTarget.reopenRevision(ROOT_REVISION_ID)).toEqual(existing.revision);
  });

  it("exposes clearAll as the only deletion exception and advances CAS only when data is removed", async () => {
    const repository = new IndexedDbZiweiBrowserWorkspaceDraft(freshFactory());
    await repository.saveRevision(revisionInput(), 0);
    await expectWorkspaceError(repository.clearAll(0), "EPOCH_CONFLICT");
    expect(await repository.clearAll(1)).toEqual({
      status: "cleared",
      removedRevisionCount: 1,
      epoch: 2
    });
    await expectWorkspaceError(repository.reopenRevision(ROOT_REVISION_ID), "REVISION_NOT_FOUND");
    expect(await repository.clearAll(2)).toEqual({
      status: "already_empty",
      removedRevisionCount: 0,
      epoch: 2
    });
  });

  it("rejects corrupted stored bytes on reopen and subsequent create, while explicit clear remains recoverable", async () => {
    const factory = freshFactory();
    const repository = new IndexedDbZiweiBrowserWorkspaceDraft(factory);
    await repository.saveRevision(revisionInput(), 0);
    await corruptStoredRevisionBytes(factory, ROOT_REVISION_ID);

    await expectWorkspaceError(repository.reopenRevision(ROOT_REVISION_ID), "INVALID_JSON");
    await expectWorkspaceError(repository.saveRevision(revisionInput(OTHER_REVISION_ID), 1), "INVALID_JSON");
    expect(await repository.getMutationState()).toMatchObject({ epoch: 1, revisionCount: 1 });
    expect(await repository.clearAll(1)).toEqual({
      status: "cleared",
      removedRevisionCount: 1,
      epoch: 2
    });
    expect(await repository.getMutationState()).toEqual({
      epoch: 2,
      revisionCount: 0,
      totalRevisionBytes: 0
    });
  });
});
