import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV26HistoricalInputs } from "./four-system-v26-history.test-fixture.mjs";

export const FOUR_SYSTEM_V27_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v27-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "693fd2265e2e9e8d7ee5c27704f5e09698222c8969ffbf194be25794e4e9f76c";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV27AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.7 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v27-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 746);
  assert.equal(manifest.expectedChildDigest,
    "2dde1ccaf92d3437da13dc0ebcd2153fa11724b0be5bfed832ba519b9d5b9637");
  assert.equal(manifest.files.length, 2);
  const names = manifest.files.map((file) => file.path);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(Object.keys(entries).sort(), [...names, MANIFEST_PATH].sort());
  let totalBytes = 0;
  for (const file of manifest.files) {
    assert.equal(path.isAbsolute(file.path), false);
    assert.equal(file.path.includes("\\") || file.path.includes(":"), false);
    assert.equal(file.path.split("/").some((part) => ["", ".", ".."].includes(part)), false);
    assert.equal(entries[file.path].byteLength, file.bytes, file.path);
    assert.equal(sha256(entries[file.path]), file.sha256, file.path);
    totalBytes += file.bytes;
  }
  assert.equal(totalBytes, 65804);
  return { entries, manifest };
}

// The parent context already includes the selected Vedic source/tool graphs.
// Only these two original records are added; no old browser run is repeated.
export async function createFourSystemV27HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV27AdditionalArchive(
    await readFile(FOUR_SYSTEM_V27_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV26HistoricalInputs();
  try {
    for (const file of manifest.files) {
      const target = path.resolve(inputs.root, file.path);
      const relative = path.relative(inputs.root, target);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(entries[file.path]), { flag: "wx" });
    }
    return inputs;
  } catch (error) {
    await inputs.cleanup();
    throw error;
  }
}
