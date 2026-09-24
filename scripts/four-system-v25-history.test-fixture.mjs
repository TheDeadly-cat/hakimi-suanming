import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV24HistoricalInputs } from "./four-system-v24-history.test-fixture.mjs";

export const FOUR_SYSTEM_V25_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v25-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "63c56417780b9ba7031521e2b2bb040f374f7cdf43e6df5dedafccf442c23d62";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV25AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.5 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v25-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 662);
  assert.equal(manifest.expectedChildDigest,
    "183253a83af0029a525eefe95207e4b4ad39d7febcc00c5c317bbaa5e837cdbc");
  assert.equal(manifest.files.length, 38);
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
  assert.equal(totalBytes, 673736);
  return { entries, manifest };
}

// Recheck the historical source/tooling graphs against the original embedded
// browser observation using current verification code. These data inputs do
// not run a new build or browser, and no observation is re-signed as current.
export async function createFourSystemV25HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV25AdditionalArchive(
    await readFile(FOUR_SYSTEM_V25_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV24HistoricalInputs();
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
