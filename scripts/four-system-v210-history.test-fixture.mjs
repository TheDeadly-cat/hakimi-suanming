import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV29HistoricalInputs } from "./four-system-v29-history.test-fixture.mjs";

export const FOUR_SYSTEM_V210_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v210-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "209251ac8ddb82435002b7d960f9485f695492b20e3edb05faf8cd2eec7662d4";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV210AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.10 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v210-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 754);
  assert.equal(manifest.expectedChildDigest,
    "768b4d46b90e6c33bf76910167b3423120e2dc3db97fbd3d83af97c53c0d217c");
  assert.equal(manifest.files.length, 18);
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
  assert.equal(totalBytes, 351761);
  return { entries, manifest };
}

// Restore original Western selected-path and browser-observation inputs.
// Archived source and dependency bytes are read as data, never executed.
export async function createFourSystemV210HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV210AdditionalArchive(
    await readFile(FOUR_SYSTEM_V210_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV29HistoricalInputs();
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
