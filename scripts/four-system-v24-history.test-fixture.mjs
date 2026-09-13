import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV23HistoricalInputs } from "./four-system-v23-history.test-fixture.mjs";

export const FOUR_SYSTEM_V24_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v24-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "cc2edc9448ef388108141d0021ce586cc6b1e56a30017a8d194c9326b44f71a3";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV24AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.4 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v24-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 618);
  assert.equal(manifest.expectedChildDigest,
    "bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840");
  assert.equal(manifest.files.length, 44);
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
  assert.equal(totalBytes, 1321115);
  const formalHelper = entries["scripts/bazi-expert-review-packet-lib.mjs"];
  assert.equal(formalHelper.byteLength, 139453);
  assert.equal(sha256(formalHelper),
    "76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669");
  return { entries, manifest };
}

// Supplement the 618-file v2.3 context with 44 individually verified original
// inputs. The historical formal verifier is read and hashed as data by the
// current precheck. It is never imported or executed from this archive.
export async function createFourSystemV24HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV24AdditionalArchive(
    await readFile(FOUR_SYSTEM_V24_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV23HistoricalInputs();
  try {
    for (const file of manifest.files) {
      const target = path.resolve(inputs.root, file.path);
      const relative = path.relative(inputs.root, target);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
      await mkdir(path.dirname(target), { recursive: true });
      // No existing v2.3 input can be replaced by this supplement.
      await writeFile(target, Buffer.from(entries[file.path]), { flag: "wx" });
    }
    return inputs;
  } catch (error) {
    await inputs.cleanup();
    throw error;
  }
}
