import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV211HistoricalInputs } from "./four-system-v211-history.test-fixture.mjs";

export const FOUR_SYSTEM_V212_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v212-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "16a0302b72f0b1839a6d36a647e8629061c83053d7a0a6b4536223f8a7f55977";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV212AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.12 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v212-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 795);
  assert.equal(manifest.expectedChildDigest,
    "9921847ccc30df5cb8e000eac70e7241031eea172bd4675b71ba2f6d967c5dc0");
  assert.equal(manifest.files.length, 12);
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
  assert.equal(totalBytes, 110124);
  return { entries, manifest };
}

// Restore original Vedic recursive authored-root inputs.
// Archived source and dependency bytes are read as data, never executed.
export async function createFourSystemV212HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV212AdditionalArchive(
    await readFile(FOUR_SYSTEM_V212_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV211HistoricalInputs();
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
