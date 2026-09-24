import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL,
  createFourSystemV22HistoricalInputs,
  parseFourSystemV22InputArchive
} from "./four-system-v22-history.test-fixture.mjs";

export const FOUR_SYSTEM_V23_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v23-additional-inputs.zip", import.meta.url);
const SHA256 = "073e5651b9988ca7fc0da96bc39276f0dde94363606f0be7e6324e46ff1d62a0";
const PATHS = [
  "content/system-admission/four-system-current-status-observation-child.v2.3.0.json",
  "content/system-admission/western-high-risk-expression-policy-draft.v0.1.0.json",
  "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json",
  "content/system-admission/western-source-binding-requirements.v1.1.0.json",
  "docs/西洋星盘契约草案与来源门-v0.1.md",
  "packages/western-astrology-contracts-draft/README.md",
  "packages/western-astrology-contracts-draft/package.json",
  "packages/western-astrology-contracts-draft/src/index.test.ts",
  "packages/western-astrology-rules-preview-draft/README.md",
  "packages/western-astrology-rules-preview-draft/src/browser-app/content-layer.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
  "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts",
  "packages/western-astronomy-engine-adapter-draft/README.md",
  "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
  "packages/western-astronomy-engine-adapter-draft/package.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-worker-entry.mjs",
  "packages/western-astronomy-engine-adapter-draft/src/contract-bridge.ts",
  "packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.ts",
  "packages/western-astronomy-engine-adapter-draft/src/delta-t-model-lock.json",
  "packages/western-astronomy-engine-adapter-draft/src/index.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/aspects.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/canonical.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/houses.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/index.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/zodiac.ts",
  "packages/western-astronomy-engine-adapter-draft/src/strict-receipt-draft.ts"
];
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV23AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), SHA256, "v2.3 additional archive identity changed");
  const entries = unzipSync(bytes);
  assert.equal(bytes.byteLength, 123704);
  assert.deepEqual(Object.keys(entries).sort(), [...PATHS].sort());
  assert.equal(PATHS.length, 29);
  let totalBytes = 0;
  for (const relativePath of PATHS) {
    assert.equal(path.isAbsolute(relativePath), false);
    assert.equal(relativePath.includes("\\") || relativePath.includes(":"), false);
    assert.equal(relativePath.split("/").some((part) => ["", ".", ".."].includes(part)), false);
    totalBytes += entries[relativePath].byteLength;
  }
  assert.equal(totalBytes, 414636);
  for (const [relativePath, bytes, digest] of [
    ["packages/western-astrology-rules-preview-draft/README.md", 18037,
      "74d1faf827c0acf301a644af51d1435d3f6ba522b58af20f8f4002f09ade6aa2"],
    ["packages/western-astrology-rules-preview-draft/src/browser-app/main.ts", 78206,
      "37d85c18a7895e5f75d3e1fc6fa8435b2f5c10376d5b2e6296bd5801fd59a61b"],
    ["docs/西洋星盘契约草案与来源门-v0.1.md", 20999,
      "3a8e38d3f321e3232c0c895476cb4b7be61473c67d7a956444ccb8d4776c6c57"]
  ]) {
    assert.equal(entries[relativePath].byteLength, bytes);
    assert.equal(sha256(entries[relativePath]), digest);
  }
  return entries;
}

// v2.3 observes a later Western source context than the original Western v1
// manifest. Preserve its declared 78206-byte main.ts and 20999-byte document;
// do not substitute those other versions merely because their names match.
// All 618 files are data, including archived source and dependency byte inputs.
export async function createFourSystemV23HistoricalInputs() {
  const entries = parseFourSystemV23AdditionalArchive(await readFile(FOUR_SYSTEM_V23_ADDITIONAL_ARCHIVE_URL));
  const base = parseFourSystemV22InputArchive(await readFile(FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL));
  const basePaths = new Set(base.manifest.files.map((file) => file.path));
  assert.equal(PATHS.some((relativePath) => basePaths.has(relativePath)), false);
  assert.equal(basePaths.size + PATHS.length, 618);
  const inputs = await createFourSystemV22HistoricalInputs();
  try {
    for (const relativePath of PATHS) {
      const target = path.resolve(inputs.root, relativePath);
      const relative = path.relative(inputs.root, target);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(entries[relativePath]), { flag: "wx" });
    }
    return inputs;
  } catch (error) {
    await inputs.cleanup();
    throw error;
  }
}
