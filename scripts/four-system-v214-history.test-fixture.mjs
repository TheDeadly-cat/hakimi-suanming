import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV213HistoricalInputs } from "./four-system-v213-history.test-fixture.mjs";

export const FOUR_SYSTEM_V214_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v214-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "ed2885bc0115ce166c95bb8624aec61b51a70166f67fcd0147098aab27c76291";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV214AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.14 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v214-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 838);
  assert.equal(manifest.expectedChildDigest,
    "78e493c478737baca20b73338310f3077fd172e20e5d1546077c9514b6b16eee");
  assert.equal(manifest.files.length, 7);
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
  assert.equal(totalBytes, 112920);
  return { entries, manifest };
}

// Restore original Western recursive authored-root inputs.
// Archived source and dependency bytes are read as data, never executed.
export async function createFourSystemV214HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV214AdditionalArchive(
    await readFile(FOUR_SYSTEM_V214_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV213HistoricalInputs();
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
