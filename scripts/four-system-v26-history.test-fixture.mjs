import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV25HistoricalInputs } from "./four-system-v25-history.test-fixture.mjs";

export const FOUR_SYSTEM_V26_ADDITIONAL_ARCHIVE_URL =
  new URL("./fixtures/four-system-v26-additional-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "029ca7f655cd66fca240502659228ad90f2859d69a7b4ccc529a53c556a43c19";
const MANIFEST_PATH = "fixture-inputs.json";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseFourSystemV26AdditionalArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.6 additional archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v26-additional-inputs/1");
  assert.equal(manifest.baseInputCount, 700);
  assert.equal(manifest.expectedChildDigest,
    "72f9cb10f46025662730bd2a4d12c1d7ec8796109350358c815a97c492b07ee7");
  assert.equal(manifest.files.length, 46);
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
  assert.equal(totalBytes, 492813);
  return { entries, manifest };
}

// Restore the Western v2 three-package authored closure as byte inputs for
// current verification code. No archived source executes or grants admission.
export async function createFourSystemV26HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV26AdditionalArchive(
    await readFile(FOUR_SYSTEM_V26_ADDITIONAL_ARCHIVE_URL)
  );
  const inputs = await createFourSystemV25HistoricalInputs();
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
