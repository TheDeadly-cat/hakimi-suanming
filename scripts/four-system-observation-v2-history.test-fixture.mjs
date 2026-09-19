import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const FOUR_SYSTEM_OBSERVATION_V2_INPUT_ARCHIVE_URL =
  new URL("./fixtures/four-system-observation-registry-v2-original-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "6948d3c4e592ea9a397d689e557db2d203eff83fce81220ebb533aa5b4dcfde3";
const MANIFEST_PATH = "fixture-inputs.json";
const PREFIX = "hakimi-four-system-observation-v2-inputs-";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseFourSystemObservationV2InputArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "observation v2 input archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-observation-registry-v2-original-inputs/1");
  assert.equal(manifest.expectedRegistryDigest,
    "fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738");
  assert.equal(manifest.files.length, 574);
  const names = manifest.files.map((file) => file.path);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(Object.keys(entries).sort(), [...names, MANIFEST_PATH].sort());
  let totalBytes = 0;
  for (const file of manifest.files) {
    assert.equal(path.isAbsolute(file.path), false);
    assert.equal(file.path.includes("\\") || file.path.includes(":"), false);
    assert.equal(file.path.split("/").some((part) => ["", ".", ".."].includes(part)), false);
    const data = entries[file.path];
    assert.equal(data.byteLength, file.bytes, file.path);
    assert.equal(sha256(data), file.sha256, file.path);
    totalBytes += data.byteLength;
  }
  assert.equal(totalBytes, 12318499);
  assert.equal(manifest.directories.length, 12);
  assert.equal(new Set(manifest.directories).size, manifest.directories.length);
  for (const directory of manifest.directories) {
    assert.equal(path.isAbsolute(directory), false);
    assert.equal(directory.includes("\\") || directory.includes(":"), false);
    assert.equal(directory.split("/").some((part) => ["", ".", ".."].includes(part)), false);
  }
  return { entries, manifest };
}

// Original input context for registry v2 and its expected-red legacy CLIs.
// Current libraries execute from the real checkout; archived code is data only.
// Discovery capture was followed by a separate uninstrumented replay.
export async function createFourSystemObservationV2HistoricalInputs() {
  const { entries, manifest } = parseFourSystemObservationV2InputArchive(
    await readFile(FOUR_SYSTEM_OBSERVATION_V2_INPUT_ARCHIVE_URL)
  );
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, PREFIX));
  const identity = await lstat(root, { bigint: true });
  let removed = false;
  async function cleanup() {
    if (removed) return;
    const final = await lstat(root, { bigint: true });
    assert.equal(final.isDirectory() && !final.isSymbolicLink(), true);
    assert.equal(final.dev, identity.dev);
    assert.equal(final.ino, identity.ino);
    assert.equal(path.dirname(await realpath(root)), parent);
    assert.equal(path.basename(root).startsWith(PREFIX), true);
    await rm(root, { recursive: true, force: true });
    removed = true;
  }
  try {
    for (const directory of manifest.directories) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    for (const file of manifest.files) {
      const target = path.resolve(root, file.path);
      const relative = path.relative(root, target);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(entries[file.path]), { flag: "wx" });
    }
    return { root, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
