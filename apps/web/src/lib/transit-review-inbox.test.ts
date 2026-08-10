import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import {
  createTransitQueryReviewBundle,
  serializeTransitQueryReviewBundle
} from "@hakimi/research-query/transit-review";
import { CaseRepository, ResearchDatabase } from "@hakimi/storage";
import {
  TRANSIT_REVIEW_INBOX_ATTACHMENT_DESCRIPTION,
  deleteTransitReviewInboxArtifact,
  importTransitReviewInboxArtifact,
  readTransitReviewInboxArtifactBytes,
  readTransitReviewInboxProjection
} from "./transit-review-inbox";

const databases: ResearchDatabase[] = [];

function createRepository(): CaseRepository {
  const database = new ResearchDatabase(`hakimi-transit-review-inbox-${crypto.randomUUID()}`);
  databases.push(database);
  return new CaseRepository(database);
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

    const projection = await readTransitReviewInboxProjection(repository);
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
});
