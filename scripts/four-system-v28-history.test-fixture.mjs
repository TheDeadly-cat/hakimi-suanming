import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV27HistoricalInputs } from "./four-system-v27-history.test-fixture.mjs";

export const FOUR_SYSTEM_V28_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v28-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "251f54d3f4d3167883aaf1ea31ead6dfbd3d864695bfc17ce82ef93084c66a3c";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV28AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.8 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v28-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 748);
  assert.equal(manifest.expectedChildDigest,
    "a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792");
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
  assert.equal(totalBytes, 88023);
  return { entries, manifest };
}

// Restore the original Ziwei v3 selected-path manifest and v2.8 record.
// Parent source/tool graphs remain byte inputs; no archived code executes.
export async function createFourSystemV28HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV28AdditionalArchive(
    await readFile(FOUR_SYSTEM_V28_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV27HistoricalInputs();
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
