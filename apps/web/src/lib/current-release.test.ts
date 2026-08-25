import { describe, expect, it } from "vitest";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  BRIDGE_RELEASE_STORAGE_MANIFEST,
  PRODUCTION_V14_RELEASE_STORAGE_MANIFEST
} from "../../release-protocol";
import {
  readCurrentReleaseDatabaseDescriptor,
  readCurrentBuildVersion,
  readCurrentReleaseEvidenceId,
  readCurrentReleaseStorageManifest,
  readCurrentReleaseStorageManifestDigest
} from "./current-release";

function documentWithMetas(metas: Record<string, string> = {}): Pick<Document, "querySelector"> {
  return {
    querySelector: (selector: string) => {
      const name = Object.keys(metas).find((candidate) => selector.includes(`name="${candidate}"`));
      return name ? ({ content: metas[name] } as HTMLMetaElement) : null;
    }
  };
}

describe("current release database descriptor", () => {
  it("开发与测试环境在无 meta 时使用 v13 bridge", () => {
    expect(readCurrentReleaseDatabaseDescriptor(documentWithMetas())).toEqual(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    );
    expect(readCurrentReleaseStorageManifest(documentWithMetas())).toBe(
      BRIDGE_RELEASE_STORAGE_MANIFEST
    );
    expect(readCurrentReleaseStorageManifestDigest(documentWithMetas())).toBeNull();
    expect(readCurrentReleaseEvidenceId(documentWithMetas())).toBeNull();
    expect(readCurrentBuildVersion(documentWithMetas())).toBeNull();
  });

  it("严格解析构建注入的影子数据库代际", () => {
    const descriptor = {
      protocolVersion: 1,
      dbGeneration: "shadow-v14",
      databaseName: "hakimi-bazi-research.shadow-v14",
      targetSchema: 14,
      minReadableSchema: 14,
      maxReadableSchema: 14,
      migrationId: "v13-to-v14",
      sourceGeneration: "legacy-v13",
      sourceDatabaseName: "hakimi-bazi-research",
      sourceSchema: 13
    };
    expect(readCurrentReleaseDatabaseDescriptor(documentWithMetas({
      "hakimi-release-database": JSON.stringify(descriptor)
    }))).toEqual({
      ...descriptor,
      acceptedCommittedMigrationIds: ["v13-to-v14"]
    });
  });

  it("拒绝覆盖源库的伪影子迁移", () => {
    const descriptor = {
      ...BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
      dbGeneration: "shadow-v14",
      targetSchema: 14,
      minReadableSchema: 14,
      maxReadableSchema: 14,
      migrationId: "v13-to-v14",
      acceptedCommittedMigrationIds: ["v13-to-v14"],
      sourceGeneration: "legacy-v13",
      sourceDatabaseName: "hakimi-bazi-research",
      sourceSchema: 13
    };
    expect(() => readCurrentReleaseDatabaseDescriptor(documentWithMetas({
      "hakimi-release-database": JSON.stringify(descriptor)
    })))
      .toThrow("影子迁移不能覆盖源数据库");
  });

  it("binds the page descriptor, storage manifest and canonical digest metadata", () => {
    const documentLike = documentWithMetas({
      "hakimi-release-database": JSON.stringify(PRODUCTION_V14_RELEASE_STORAGE_MANIFEST.database),
      "hakimi-release-storage-manifest": JSON.stringify(PRODUCTION_V14_RELEASE_STORAGE_MANIFEST),
      "hakimi-release-storage-manifest-digest": "a".repeat(64)
    });
    expect(readCurrentReleaseStorageManifest(documentLike)).toEqual(
      PRODUCTION_V14_RELEASE_STORAGE_MANIFEST
    );
    expect(readCurrentReleaseStorageManifestDigest(documentLike)).toBe("a".repeat(64));

    expect(() => readCurrentReleaseStorageManifest(documentWithMetas({
      "hakimi-release-database": JSON.stringify(BRIDGE_RELEASE_DATABASE_DESCRIPTOR),
      "hakimi-release-storage-manifest": JSON.stringify(PRODUCTION_V14_RELEASE_STORAGE_MANIFEST)
    }))).toThrow("描述符与发布存储清单不一致");
    expect(() => readCurrentReleaseStorageManifestDigest(documentWithMetas({
      "hakimi-release-storage-manifest-digest": "not-a-digest"
    }))).toThrow("不是规范 SHA-256");
  });

  it("distinguishes a bound evidence package from an explicit local-only build", () => {
    const boundId = `hre1-${"b".repeat(32)}`;
    expect(readCurrentReleaseEvidenceId(documentWithMetas({
      "hakimi-release-evidence-id": boundId
    }))).toBe(boundId);
    expect(readCurrentReleaseEvidenceId(documentWithMetas({
      "hakimi-release-evidence-id": "unbound-local-build"
    }))).toBe("unbound-local-build");
    expect(readCurrentBuildVersion(documentWithMetas({
      "hakimi-build-version": "012345abcdef"
    }))).toBe("012345abcdef");
    expect(() => readCurrentReleaseEvidenceId(documentWithMetas({
      "hakimi-release-evidence-id": "claimed-release"
    }))).toThrow("不符合规范");
    expect(() => readCurrentBuildVersion(documentWithMetas({
      "hakimi-build-version": "not-a-build"
    }))).toThrow("不符合规范");
  });
});
