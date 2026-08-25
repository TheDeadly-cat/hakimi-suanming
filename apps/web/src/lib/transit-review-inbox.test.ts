import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import type { LocalAttachmentRecord } from "@hakimi/contracts";
import {
  createTransitQueryReviewBundle,
  serializeTransitQueryReviewBundle
} from "@hakimi/research-query/transit-review";
import {
  CaseRepository,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  ResearchDatabase,
  type LocalAttachmentMetadata,
  type LocalAttachmentPurposeMetadataSnapshot
} from "@hakimi/storage";
import {
  MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES,
  MAX_TRANSIT_REVIEW_INBOX_SCAN_BASE64_CODE_UNITS,
  MAX_TRANSIT_REVIEW_INBOX_SCAN_ROWS,
  MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS,
  MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES,
  TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
  deleteTransitReviewInboxArtifact,
  importTransitReviewInboxArtifact,
  readTransitReviewInboxArtifactBytes,
  readTransitReviewInboxProjection
} from "./transit-review-inbox";

const databases: ResearchDatabase[] = [];

type AttachmentMetadata = LocalAttachmentMetadata;

type AttachmentMetadataSourceRow = {
  item: AttachmentMetadata;
  encodedCharacters: number;
};

type TestTransitReviewInboxRepository = CaseRepository & {
  listAttachments: ReturnType<typeof vi.fn<() => Promise<LocalAttachmentRecord[]>>>;
  readAttachmentMetadataPage: ReturnType<typeof vi.fn<CaseRepository["readAttachmentMetadataPage"]>>;
  readAttachmentPurposeMetadataSnapshot: ReturnType<typeof vi.fn<
    CaseRepository["readAttachmentPurposeMetadataSnapshot"]
  >>;
  setAttachmentMetadataSourceRows(rows: readonly AttachmentMetadataSourceRow[] | null): void;
};

function metadataFromRawRecord(record: LocalAttachmentRecord): AttachmentMetadataSourceRow {
  const { contentBase64, ...metadata } = record;
  return {
    item: { ...metadata, contentIntegrity: "unchecked" },
    encodedCharacters: typeof contentBase64 === "string" ? contentBase64.length : 0
  };
}

function createRepository(): TestTransitReviewInboxRepository {
  const database = new ResearchDatabase(`hakimi-transit-review-inbox-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = new CaseRepository(database) as TestTransitReviewInboxRepository;
  let overrideRows: readonly AttachmentMetadataSourceRow[] | null = null;
  repository.listAttachments = vi.fn(async () => {
    throw new Error("readTransitReviewInboxProjection must not call listAttachments");
  });
  repository.readAttachmentMetadataPage = vi.fn(async () => {
    throw new Error("readTransitReviewInboxProjection must not call readAttachmentMetadataPage");
  });
  repository.readAttachmentPurposeMetadataSnapshot = vi.fn(async (
    options
  ): Promise<LocalAttachmentPurposeMetadataSnapshot> => {
    if (
      options.mediaType !== "application/json" ||
      options.description !== TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION ||
      options.unlinkedOnly !== true
    ) {
      throw new Error("transit inbox purpose snapshot must bind the exact local inbox filter");
    }
    const sourceRows = overrideRows ?? (await repository.database.attachments.toArray())
      .map((record) => metadataFromRawRecord(record));
    const jsonRows = sourceRows.filter((row) => row.item.mediaType === options.mediaType);
    if (jsonRows.length > MAX_TRANSIT_REVIEW_INBOX_SCAN_ROWS) {
      throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
        "SCAN_ROW_LIMIT_EXCEEDED",
        "synthetic purpose snapshot exceeded its scan-row budget"
      );
    }

    const items: AttachmentMetadata[] = [];
    let scannedEncodedCharacters = 0;
    let matchedDeclaredBytes = 0;
    for (const row of jsonRows) {
      if (
        scannedEncodedCharacters + row.encodedCharacters >
        MAX_TRANSIT_REVIEW_INBOX_SCAN_BASE64_CODE_UNITS
      ) {
        throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
          "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
          "synthetic purpose snapshot exceeded its encoded-character budget"
        );
      }
      scannedEncodedCharacters += row.encodedCharacters;
      if (
        row.item.description !== options.description ||
        row.item.link !== null
      ) {
        continue;
      }
      if (items.length >= MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS) {
        throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
          "MATCH_LIMIT_EXCEEDED",
          "synthetic purpose snapshot exceeded its match-count budget"
        );
      }
      if (
        matchedDeclaredBytes + row.item.byteLength >
        MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES
      ) {
        throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
          "MATCHED_BYTE_LIMIT_EXCEEDED",
          "synthetic purpose snapshot exceeded its matched-byte budget"
        );
      }
      matchedDeclaredBytes += row.item.byteLength;
      items.push(row.item);
    }
    return {
      filter: {
        mediaType: options.mediaType,
        description: options.description,
        unlinkedOnly: true
      },
      items,
      scannedCount: jsonRows.length,
      scannedEncodedCharacters,
      matchedDeclaredBytes,
      contentIntegrityVerified: false,
      coverage: "complete",
      atomicStorageSnapshotVerified: true
    };
  });
  repository.setAttachmentMetadataSourceRows = (rows) => {
    overrideRows = rows;
  };
  return repository;
}

function assertPurposeSnapshotContract(repository: TestTransitReviewInboxRepository): void {
  expect(repository.listAttachments).not.toHaveBeenCalled();
  expect(repository.readAttachmentMetadataPage).not.toHaveBeenCalled();
  expect(repository.readAttachmentPurposeMetadataSnapshot).toHaveBeenCalled();
  for (const [options] of repository.readAttachmentPurposeMetadataSnapshot.mock.calls) {
    expect(options).toEqual({
      mediaType: "application/json",
      description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
      unlinkedOnly: true
    });
  }
}

async function createMetadataTemplate(
  repository: TestTransitReviewInboxRepository
): Promise<AttachmentMetadata> {
  const record = await repository.createAttachment({
    fileName: "metadata-template.json",
    mediaType: "application/json",
    bytes: new Uint8Array(),
    description: "metadata template",
    link: null
  });
  return metadataFromRawRecord(record).item;
}

function syntheticMetadataRows(options: {
  template: AttachmentMetadata;
  count: number;
  matching: boolean;
  byteLength: number;
  encodedCharacters: number;
}): AttachmentMetadataSourceRow[] {
  return Array.from({ length: options.count }, (_, index) => ({
    item: {
      ...options.template,
      id: crypto.randomUUID(),
      fileName: `metadata-${index}.json`,
      description: options.matching
        ? TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION
        : "unrelated application/json attachment",
      link: null,
      byteLength: options.byteLength,
      contentIntegrity: "unchecked"
    },
    encodedCharacters: options.encodedCharacters
  }));
}

async function expectCoverageLimitExceeded(
  repository: TestTransitReviewInboxRepository,
  rows: readonly AttachmentMetadataSourceRow[]
): Promise<void> {
  repository.setAttachmentMetadataSourceRows(rows);
  const readBytes = vi.spyOn(repository, "readAttachmentBytes");
  await expect(readTransitReviewInboxProjection(repository)).rejects.toMatchObject({
    code: "INBOX_COVERAGE_LIMIT_EXCEEDED"
  });
  assertPurposeSnapshotContract(repository);
  expect(readBytes).not.toHaveBeenCalled();
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  for (const name of names) await Dexie.delete(name);
});

describe("local unverified transit review inbox", () => {
  it("按原始字节幂等保存、刷新重预检、进入附件快照并用摘要 CAS 删除", async () => {
    const repository = createRepository();
    const bundle = await createTransitQueryReviewBundle({
      generatedAt: "2026-08-03T00:00:00.000Z"
    });
    const raw = `\uFEFF${serializeTransitQueryReviewBundle(bundle).replace(/\n/g, "\r\n")}`;
    const bytes = new TextEncoder().encode(raw);

    const first = await importTransitReviewInboxArtifact({
      fileName: "复核批次.json",
      bytes
    }, repository);
    const duplicate = await importTransitReviewInboxArtifact({
      fileName: "另一个文件名.json",
      bytes
    }, repository);

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.attachment.id).toBe(first.attachment.id);
    expect(await repository.database.attachments.count()).toBe(1);

    const unrelated = await repository.createAttachment({
      fileName: "unrelated-bad-json.json",
      mediaType: "application/json",
      bytes: new TextEncoder().encode("{not-valid-json"),
      description: "unrelated application/json attachment",
      link: null
    });
    const readBytes = vi.spyOn(repository, "readAttachmentBytes");
    const projection = await readTransitReviewInboxProjection(repository);
    assertPurposeSnapshotContract(repository);
    expect(readBytes.mock.calls.map(([id]) => id)).toEqual([first.attachment.id]);
    expect(readBytes).not.toHaveBeenCalledWith(unrelated.id, expect.anything());
    const firstPurposeSnapshot = await repository.readAttachmentPurposeMetadataSnapshot
      .mock.results[0]!.value;
    expect(firstPurposeSnapshot).toMatchObject({
      filter: {
        mediaType: "application/json",
        description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
        unlinkedOnly: true
      },
      scannedCount: 2,
      matchedDeclaredBytes: first.attachment.byteLength,
      contentIntegrityVerified: false,
      coverage: "complete",
      atomicStorageSnapshotVerified: true
    });
    expect(firstPurposeSnapshot.items).toHaveLength(1);
    expect(firstPurposeSnapshot.items[0]).toMatchObject({
      id: first.attachment.id,
      contentIntegrity: "unchecked"
    });
    expect(firstPurposeSnapshot.items[0]).not.toHaveProperty("contentBase64");
    expect(projection).toMatchObject({
      evidenceBoundary: "local_unverified",
      identityVerified: false,
      sourceAuthenticityVerified: false,
      eligibleForFixtureIntegration: false,
      countsAsVerifiedGold: false,
      verifiedTransitFactsDelta: 0,
      verifiedQueryAdjudicationsDelta: 0,
      summary: {
        storedArtifacts: 1,
        currentBundles: 1,
        passedIndependentReviews: 0,
        passedAdjudications: 0,
        waitingDependencies: 0,
        failedOrCorrupt: 0
      }
    });
    expect(projection.artifacts[0]).toMatchObject({
      kind: "review_bundle",
      artifactDigest: bundle.digest,
      reviewBundleDigest: bundle.digest,
      status: "bundle_current"
    });
    expect(projection.batches).toHaveLength(1);
    expect(projection.batches[0]?.candidates).toHaveLength(18);
    const restoredBytes = await readTransitReviewInboxArtifactBytes(projection.artifacts[0]!, repository);
    expect(restoredBytes.byteLength).toBe(bytes.byteLength);
    expect(restoredBytes.every((value, index) => value === bytes[index])).toBe(true);

    await repository.deleteAttachment(unrelated.id, {
      expectedContentHash: unrelated.contentHash
    });
    const snapshot = await repository.readFullDataSnapshot();
    expect(snapshot.attachments).toEqual([
      expect.objectContaining({
        id: first.attachment.id,
        contentHash: first.attachment.contentHash,
        description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
        mediaType: "application/json",
        link: null
      })
    ]);

    await expect(deleteTransitReviewInboxArtifact({
      attachmentId: first.attachment.id,
      rawContentHash: "0".repeat(64)
    }, repository)).rejects.toMatchObject({ code: "ATTACHMENT_CHANGED" });
    expect(await repository.database.attachments.count()).toBe(1);

    await deleteTransitReviewInboxArtifact(projection.artifacts[0]!, repository);
    expect((await readTransitReviewInboxProjection(repository)).summary.storedArtifacts).toBe(0);
  }, 30_000);

  it("在落库前拒绝未知格式和非 UTF-8 原件", async () => {
    const repository = createRepository();

    await expect(importTransitReviewInboxArtifact({
      fileName: "unknown.json",
      bytes: new TextEncoder().encode('{"format":"other"}')
    }, repository)).rejects.toMatchObject({ code: "ARTIFACT_FORMAT_UNSUPPORTED" });

    await expect(importTransitReviewInboxArtifact({
      fileName: "invalid.json",
      bytes: Uint8Array.from([0xc3, 0x28])
    }, repository)).rejects.toMatchObject({ code: "INVALID_UTF8" });

    expect(await repository.database.attachments.count()).toBe(0);
  });

  it("拒绝 null、primitive、访问器、未知字段、稀疏数组及不一致的 purpose 快照回执", async () => {
    const repository = createRepository();
    const template = await createMetadataTemplate(repository);
    const item = syntheticMetadataRows({
      template,
      count: 1,
      matching: true,
      byteLength: 1,
      encodedCharacters: 4
    })[0]!.item;
    const validSnapshot = {
      filter: {
        mediaType: "application/json",
        description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
        unlinkedOnly: true
      },
      items: [item],
      scannedCount: 1,
      scannedEncodedCharacters: 4,
      matchedDeclaredBytes: 1,
      contentIntegrityVerified: false,
      coverage: "complete",
      atomicStorageSnapshotVerified: true
    } satisfies LocalAttachmentPurposeMetadataSnapshot;
    const outerGetterSnapshot = { ...validSnapshot };
    Object.defineProperty(outerGetterSnapshot, "items", {
      enumerable: true,
      get: () => [item]
    });
    const itemGetter = { ...item };
    Object.defineProperty(itemGetter, "byteLength", {
      enumerable: true,
      get: () => 1
    });
    const sparseItems = new Array(1);
    const invalidSnapshots: unknown[] = [
      null,
      7,
      outerGetterSnapshot,
      { ...validSnapshot, unexpectedOuterField: true },
      { ...validSnapshot, items: [itemGetter] },
      { ...validSnapshot, items: [{ ...item, unexpectedItemField: true }] },
      { ...validSnapshot, items: sparseItems },
      { ...validSnapshot, coverage: "partial" },
      { ...validSnapshot, atomicStorageSnapshotVerified: false },
      {
        ...validSnapshot,
        items: [item, item],
        scannedCount: 2,
        scannedEncodedCharacters: 8,
        matchedDeclaredBytes: 2
      },
      { ...validSnapshot, matchedDeclaredBytes: 0 }
    ];
    const readBytes = vi.spyOn(repository, "readAttachmentBytes");

    for (const snapshot of invalidSnapshots) {
      repository.readAttachmentPurposeMetadataSnapshot.mockResolvedValueOnce(
        snapshot as unknown as LocalAttachmentPurposeMetadataSnapshot
      );
      await expect(readTransitReviewInboxProjection(repository)).rejects.toMatchObject({
        code: "LOCAL_RECORD_INVALID"
      });
    }

    assertPurposeSnapshotContract(repository);
    expect(readBytes).not.toHaveBeenCalled();
  });

  it("purpose snapshot 返回后篡改原回执不会改变正在进行的投影", async () => {
    const repository = createRepository();
    const bundle = await createTransitQueryReviewBundle({
      generatedAt: "2026-08-03T00:00:00.000Z"
    });
    const bytes = new TextEncoder().encode(serializeTransitQueryReviewBundle(bundle));
    const stored = await importTransitReviewInboxArtifact({
      fileName: "mutable-snapshot.json",
      bytes
    }, repository);
    const mutableItem = { ...metadataFromRawRecord(stored.attachment).item };
    const mutableSnapshot = {
      filter: {
        mediaType: "application/json",
        description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
        unlinkedOnly: true
      },
      items: [mutableItem],
      scannedCount: 1,
      scannedEncodedCharacters: stored.attachment.contentBase64.length,
      matchedDeclaredBytes: stored.attachment.byteLength,
      contentIntegrityVerified: false,
      coverage: "complete",
      atomicStorageSnapshotVerified: true
    };
    let snapshotReturned = false;
    repository.readAttachmentPurposeMetadataSnapshot.mockImplementationOnce(async (options) => {
      expect(options).toEqual({
        mediaType: "application/json",
        description: TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
        unlinkedOnly: true
      });
      snapshotReturned = true;
      return mutableSnapshot as LocalAttachmentPurposeMetadataSnapshot;
    });
    const originalReadAttachmentBytes = repository.readAttachmentBytes.bind(repository);
    const readBytes = vi.spyOn(repository, "readAttachmentBytes").mockImplementation(async (
      id,
      options
    ) => {
      expect(snapshotReturned).toBe(true);
      mutableSnapshot.filter.description = "changed after snapshot return";
      mutableSnapshot.matchedDeclaredBytes = 0;
      mutableSnapshot.items.length = 0;
      mutableItem.id = crypto.randomUUID();
      mutableItem.byteLength = 0;
      mutableItem.contentHash = "0".repeat(64);
      return originalReadAttachmentBytes(id, options);
    });

    const projection = await readTransitReviewInboxProjection(repository);

    assertPurposeSnapshotContract(repository);
    expect(readBytes).toHaveBeenCalledOnce();
    expect(readBytes).toHaveBeenCalledWith(stored.attachment.id, {
      expectedContentHash: stored.attachment.contentHash
    });
    expect(projection.artifacts).toEqual([
      expect.objectContaining({
        attachmentId: stored.attachment.id,
        byteLength: stored.attachment.byteLength,
        rawContentHash: stored.attachment.contentHash,
        status: "bundle_current"
      })
    ]);
    expect(projection.summary).toMatchObject({
      storedArtifacts: 1,
      currentBundles: 1,
      failedOrCorrupt: 0
    });
  });

  it("扫描超过 256 个 application/json 元数据行时失败关闭且不读取正文", async () => {
    const repository = createRepository();
    const template = await createMetadataTemplate(repository);
    await expectCoverageLimitExceeded(repository, syntheticMetadataRows({
      template,
      count: MAX_TRANSIT_REVIEW_INBOX_SCAN_ROWS + 1,
      matching: false,
      byteLength: 0,
      encodedCharacters: 0
    }));
  });

  it("扫描累计超过 64 MiB Base64 code units 时失败关闭且不返回完整摘要", async () => {
    const repository = createRepository();
    const template = await createMetadataTemplate(repository);
    const rowEncodedCharacters = Math.floor(
      MAX_TRANSIT_REVIEW_INBOX_SCAN_BASE64_CODE_UNITS / 32
    ) + 1;
    await expectCoverageLimitExceeded(repository, syntheticMetadataRows({
      template,
      count: 33,
      matching: false,
      byteLength: 0,
      encodedCharacters: rowEncodedCharacters
    }));
  });

  it("匹配收件箱工件超过 64 个时在任何正文读取前失败关闭", async () => {
    const repository = createRepository();
    const template = await createMetadataTemplate(repository);
    await expectCoverageLimitExceeded(repository, syntheticMetadataRows({
      template,
      count: MAX_TRANSIT_REVIEW_INBOX_STORED_ARTIFACTS + 1,
      matching: true,
      byteLength: 1,
      encodedCharacters: 4
    }));
  });

  it("匹配收件箱工件声明原始字节累计超过 32 MiB 时在任何正文读取前失败关闭", async () => {
    const repository = createRepository();
    const template = await createMetadataTemplate(repository);
    const count = Math.floor(
      MAX_TRANSIT_REVIEW_INBOX_TOTAL_RAW_BYTES / MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES
    ) + 1;
    await expectCoverageLimitExceeded(repository, syntheticMetadataRows({
      template,
      count,
      matching: true,
      byteLength: MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES,
      encodedCharacters: 4 * Math.ceil(MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES / 3)
    }));
  });
});
