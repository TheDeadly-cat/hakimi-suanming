import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(
  packageRoot,
  "../../content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json"
);
const schemaBytes = readFileSync(schemaPath);
const schemaSha256 = createHash("sha256").update(schemaBytes).digest("hex");

if (schemaBytes.byteLength !== 16_529
  || schemaSha256 !== "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69") {
  throw new Error("Vedic input preflight test schema source identity drifted");
}

export default defineConfig({
  root: packageRoot,
  resolve: {
    alias: {
      "virtual:vedic-input-draft-schema": schemaPath
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"]
  }
});
