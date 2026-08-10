import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(webRoot, "../..");

describe("cross-Schema fixture configuration", () => {
  it("pins production marker contracts for Schema 14, 15 and 16", async () => {
    const [config, storage] = await Promise.all([
      readFile(path.join(webRoot, "vite.cross-schema-upgrade.config.ts"), "utf8"),
      readFile(path.join(workspaceRoot, "packages/storage/src/index.ts"), "utf8")
    ]);
    const markers = [
      "this.version(14).stores({",
      "this.version(15).stores({",
      "this.version(16).stores({",
      'mutationState: "&id"'
    ];

    expect(config).toContain("Record<ProductionMigrationSchema, readonly string[]>");
    expect(config).toContain("const SUPPORTED_TARGET_SCHEMAS = [13, 14, 15, 16] as const;");
    for (const marker of markers) {
      expect(config).toContain(marker);
      expect(storage).toContain(marker);
    }
  });

  it("locates each fault block by the next version or the constructor boundary", async () => {
    const config = await readFile(
      path.join(webRoot, "vite.cross-schema-upgrade.config.ts"),
      "utf8"
    );

    expect(config).toContain("const nextVersionMarker = `this.version(${targetSchema + 1}).stores({`;");
    expect(config).toContain("const nextVersionBoundary = code.indexOf(nextVersionMarker");
    expect(config).toContain('const classBoundary = code.indexOf("\\n  }\\n\\n  "');
    expect(config).toContain("nextVersionBoundary >= 0 ? nextVersionBoundary : classBoundary");
    expect(config).not.toContain("targetSchema === 14\n    ? code.indexOf");
  });
});
