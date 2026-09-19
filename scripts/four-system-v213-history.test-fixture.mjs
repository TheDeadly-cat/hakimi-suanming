import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV212HistoricalInputs } from "./four-system-v212-history.test-fixture.mjs";

export const FOUR_SYSTEM_V213_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v213-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "0349b85f05512e449c6d72bfe73c3238fc60de291a54da486525dd22363dd06e";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV213AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.13 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v213-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 807);
  assert.equal(manifest.expectedChildDigest,
    "5d1cbad8a5c49fe970e9bc6f30fbe949a3eb56947e08efc9099ce0077bc01864");
  assert.equal(manifest.files.length, 31);
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
  assert.equal(totalBytes, 406885);
  return { entries, manifest };
}

// Restore original Ziwei authored-root inputs.
// Archived source and dependency bytes are read as data, never executed.
export async function createFourSystemV213HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV213AdditionalArchive(
    await readFile(FOUR_SYSTEM_V213_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV212HistoricalInputs();
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
