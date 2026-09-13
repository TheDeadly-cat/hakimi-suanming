import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV210HistoricalInputs } from "./four-system-v210-history.test-fixture.mjs";

export const FOUR_SYSTEM_V211_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v211-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "5394b872aa537143ef09130557c508eb3cdd1a07a9639ccbb8b667738366e11e";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV211AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.11 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v211-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 772);
  assert.equal(manifest.expectedChildDigest,
    "21d12ce28ba635f7e6ca8f79478421122705f12586266dc1866eb08c083cd2e9");
  assert.equal(manifest.files.length, 23);
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
  assert.equal(totalBytes, 4549837);
  return { entries, manifest };
}

// Restore original Western selected-path and browser-observation inputs.
// Archived source and dependency bytes are read as data, never executed.
export async function createFourSystemV211HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV211AdditionalArchive(
    await readFile(FOUR_SYSTEM_V211_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV210HistoricalInputs();
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
