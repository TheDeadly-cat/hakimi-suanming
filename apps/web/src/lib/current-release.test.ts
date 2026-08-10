import { describe, expect, it } from "vitest";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../../release-protocol";
import { readCurrentReleaseDatabaseDescriptor } from "./current-release";

function documentWithMeta(content: string | null): Pick<Document, "querySelector"> {
  return {
    querySelector: () => content === null ? null : ({ content } as HTMLMetaElement)
  };
}

describe("current release database descriptor", () => {
  it("开发与测试环境在无 meta 时使用 v13 bridge", () => {
    expect(readCurrentReleaseDatabaseDescriptor(documentWithMeta(null))).toEqual(
      BRIDGE_RELEASE_DATABASE_DESCRIPTOR
    );
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
    expect(readCurrentReleaseDatabaseDescriptor(documentWithMeta(JSON.stringify(descriptor)))).toEqual({
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
    expect(() => readCurrentReleaseDatabaseDescriptor(documentWithMeta(JSON.stringify(descriptor))))
      .toThrow("影子迁移不能覆盖源数据库");
  });
});
