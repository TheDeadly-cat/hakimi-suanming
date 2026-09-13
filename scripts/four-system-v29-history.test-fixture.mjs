import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV28HistoricalInputs } from "./four-system-v28-history.test-fixture.mjs";

export const FOUR_SYSTEM_V29_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v29-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "81564dd8cae3ed456cf70583bc07d08b12fe1052d79ba87367f9a9fa7ca1a1b1";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV29AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.9 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v29-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 750);
  assert.equal(manifest.expectedChildDigest,
    "0406537cf99b025644fb294068d9515c2c0a0ff4a0bf322edcbf39722447b6a1");
  assert.equal(manifest.files.length, 4);
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
  assert.equal(totalBytes, 70756);
  return { entries, manifest };
}

// Restore original Bazi v1.1 records and the timestamp-label erratum.
// The original null correction and zero expert counts grant no new authority.
export async function createFourSystemV29HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV29AdditionalArchive(
    await readFile(FOUR_SYSTEM_V29_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV28HistoricalInputs();
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
